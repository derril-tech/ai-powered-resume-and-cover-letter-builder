"""
Task Queue
Handles asynchronous task processing for the optimize worker.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class TaskQueue:
    """Simple task queue for optimize worker operations"""

    def __init__(self):
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", "6379"))
        self.redis_password = os.getenv("REDIS_PASSWORD", "")
        self.redis_client = None
        self.nats_client = None

    async def connect(self):
        """Connect to queue systems"""
        try:
            # Try Redis first
            try:
                import redis.asyncio as redis
                self.redis_client = redis.Redis(
                    host=self.redis_host,
                    port=self.redis_port,
                    password=self.redis_password or None,
                    decode_responses=True,
                )
                await self.redis_client.ping()
                logger.info("Connected to Redis for task queue")
            except ImportError:
                logger.warning("Redis not available, using in-memory queue")
                self.redis_client = None
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}, using in-memory queue")
                self.redis_client = None

            # Try NATS
            try:
                import nats
                self.nats_client = await nats.connect(
                    servers=[f"nats://{self.redis_host}:{self.redis_port + 1}"]
                )
                logger.info("Connected to NATS for task queue")
            except ImportError:
                logger.warning("NATS not available")
                self.nats_client = None
            except Exception as e:
                logger.warning(f"NATS connection failed: {e}")
                self.nats_client = None

        except Exception as e:
            logger.error(f"Failed to connect to queue systems: {e}")

    async def disconnect(self):
        """Disconnect from queue systems"""
        if self.redis_client:
            await self.redis_client.close()
        if self.nats_client:
            await self.nats_client.close()

    async def add_task(self, task_type: str, payload: Dict[str, Any]) -> str:
        """Add a task to the queue"""
        try:
            task_id = f"{task_type}_{int(asyncio.get_event_loop().time() * 1000)}"

            task_data = {
                "id": task_id,
                "type": task_type,
                "payload": payload,
                "status": "queued",
                "created_at": datetime.now().isoformat(),
                "retries": 0,
            }

            # Store in Redis if available
            if self.redis_client:
                await self.redis_client.setex(
                    f"task:{task_id}",
                    3600,  # 1 hour expiration
                    json.dumps(task_data)
                )
                await self.redis_client.lpush("optimize_tasks", task_id)

            # Publish to NATS if available
            if self.nats_client:
                await self.nats_client.publish(
                    "optimize.tasks",
                    json.dumps(task_data).encode()
                )

            logger.info(f"Added task {task_id} of type {task_type}")
            return task_id

        except Exception as e:
            logger.error(f"Failed to add task: {e}")
            raise

    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a task"""
        try:
            if self.redis_client:
                task_data = await self.redis_client.get(f"task:{task_id}")
                if task_data:
                    return json.loads(task_data)

            return None

        except Exception as e:
            logger.warning(f"Failed to get task status: {e}")
            return None

    async def update_task_status(
        self,
        task_id: str,
        status: str,
        result: Optional[Any] = None,
        error: Optional[str] = None,
    ):
        """Update task status"""
        try:
            if not self.redis_client:
                return

            # Get current task data
            task_data = await self.redis_client.get(f"task:{task_id}")
            if not task_data:
                return

            task_info = json.loads(task_data)
            task_info["status"] = status
            task_info["updated_at"] = datetime.now().isoformat()

            if result is not None:
                task_info["result"] = result
            if error is not None:
                task_info["error"] = error

            # Store updated data
            await self.redis_client.setex(
                f"task:{task_id}",
                3600,
                json.dumps(task_info)
            )

            logger.info(f"Updated task {task_id} status to {status}")

        except Exception as e:
            logger.warning(f"Failed to update task status: {e}")

    async def process_tasks(self):
        """Process queued tasks"""
        try:
            if not self.redis_client:
                return

            while True:
                # Get next task
                task_id = await self.redis_client.rpop("optimize_tasks")
                if not task_id:
                    await asyncio.sleep(1)  # Wait before checking again
                    continue

                # Get task data
                task_data = await self.redis_client.get(f"task:{task_id}")
                if not task_data:
                    continue

                task_info = json.loads(task_data)

                try:
                    # Mark as processing
                    await self.update_task_status(task_id, "processing")

                    # Process task based on type
                    result = await self._process_task(task_info)

                    # Mark as completed
                    await self.update_task_status(task_id, "completed", result=result)

                except Exception as e:
                    logger.error(f"Failed to process task {task_id}: {e}")
                    await self.update_task_status(task_id, "failed", error=str(e))

        except Exception as e:
            logger.error(f"Task processing loop failed: {e}")

    async def _process_task(self, task_info: Dict[str, Any]) -> Any:
        """Process a single task"""
        task_type = task_info["type"]
        payload = task_info["payload"]

        if task_type == "optimize_resume":
            # Import here to avoid circular imports
            from ..core.resume_optimizer import ResumeOptimizer
            from ..core.star_generator import STARGenerator
            from ..core.keyword_optimizer import KeywordOptimizer
            from ..core.ats_optimizer import ATSOptimizer
            from ..core.section_optimizer import SectionOptimizer

            # This would normally be injected as a dependency
            # For now, we'll create a simple response
            return {
                "optimized_content": payload.get("resume_content", {}),
                "optimization_score": 85.0,
                "status": "processed",
            }

        elif task_type == "generate_star":
            return {
                "star_bullets": ["• Achieved significant results through strategic actions"],
                "status": "processed",
            }

        elif task_type == "optimize_keywords":
            return {
                "keywords_added": ["Python", "Machine Learning"],
                "status": "processed",
            }

        else:
            logger.warning(f"Unknown task type: {task_type}")
            return {"status": "unknown_task_type"}

    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        try:
            stats = {
                "queued_tasks": 0,
                "processing_tasks": 0,
                "completed_tasks": 0,
                "failed_tasks": 0,
            }

            if self.redis_client:
                # Count tasks by status (this is a simplified version)
                # In production, you'd use proper Redis keys/patterns
                stats["queued_tasks"] = await self.redis_client.llen("optimize_tasks") or 0

            return stats

        except Exception as e:
            logger.warning(f"Failed to get queue stats: {e}")
            return {
                "queued_tasks": 0,
                "processing_tasks": 0,
                "completed_tasks": 0,
                "failed_tasks": 0,
            }
