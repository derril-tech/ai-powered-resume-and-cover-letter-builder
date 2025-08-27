"""
Task Queue
Handles asynchronous job description parsing tasks using Redis/Celery or NATS.
"""

import json
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)

class TaskStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskResult:
    def __init__(self, task_id: str, status: str, result: Optional[Any] = None, error: Optional[str] = None):
        self.task_id = task_id
        self.status = status
        self.result = result
        self.error = error
        self.created_at = datetime.now()
        self.completed_at = datetime.now() if status in [TaskStatus.COMPLETED, TaskStatus.FAILED] else None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

class TaskQueue:
    """Asynchronous task queue for job description parsing"""

    def __init__(self, redis_url: Optional[str] = None, nats_url: Optional[str] = None):
        self.redis_url = redis_url or "redis://localhost:6379"
        self.nats_url = nats_url or "nats://localhost:4222"
        self.redis = None
        self.nats = None
        self.task_results: Dict[str, TaskResult] = {}
        self._initialized = False

    async def connect(self):
        """Initialize connections to Redis and/or NATS"""
        if self._initialized:
            return

        try:
            # Try to connect to Redis first
            try:
                import redis.asyncio as redis
                self.redis = redis.from_url(self.redis_url, decode_responses=True)
                await self.redis.ping()
                logger.info("Connected to Redis for task queue")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
                self.redis = None

            # Try to connect to NATS
            try:
                import nats
                self.nats = await nats.connect(self.nats_url)
                logger.info("Connected to NATS for task queue")
            except Exception as e:
                logger.warning(f"NATS connection failed: {e}")
                self.nats = None

            if not self.redis and not self.nats:
                raise Exception("Neither Redis nor NATS is available for task queue")

            self._initialized = True
            logger.info("Task queue initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize task queue: {e}")
            raise

    async def disconnect(self):
        """Close connections"""
        if self.redis:
            await self.redis.close()
        if self.nats:
            await self.nats.close()
        self._initialized = False

    async def add_task(self, task_type: str, payload: Dict[str, Any]) -> str:
        """Add a task to the queue"""
        if not self._initialized:
            await self.connect()

        task_id = str(uuid.uuid4())
        task_data = {
            "task_id": task_id,
            "task_type": task_type,
            "payload": payload,
            "status": TaskStatus.PENDING,
            "created_at": datetime.now().isoformat(),
        }

        # Store task result placeholder
        self.task_results[task_id] = TaskResult(task_id, TaskStatus.PENDING)

        try:
            if self.redis:
                # Use Redis as queue
                await self.redis.setex(f"task:{task_id}", 3600, json.dumps(task_data))
                await self.redis.lpush("job_parser_queue", task_id)
                logger.info(f"Task {task_id} added to Redis queue")
            elif self.nats:
                # Use NATS for queuing
                await self.nats.publish("job_parser.tasks", json.dumps(task_data).encode())
                logger.info(f"Task {task_id} published to NATS")

            return task_id

        except Exception as e:
            logger.error(f"Failed to add task {task_id}: {e}")
            self.task_results[task_id] = TaskResult(task_id, TaskStatus.FAILED, error=str(e))
            raise

    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a task"""
        # Check in-memory results first
        if task_id in self.task_results:
            return self.task_results[task_id].to_dict()

        # Check Redis if available
        if self.redis:
            try:
                task_data = await self.redis.get(f"task:{task_id}")
                if task_data:
                    return json.loads(task_data)
            except Exception as e:
                logger.warning(f"Failed to get task status from Redis: {e}")

        return None

    async def update_task_status(
        self,
        task_id: str,
        status: str,
        result: Optional[Any] = None,
        error: Optional[str] = None
    ):
        """Update task status"""
        task_result = TaskResult(task_id, status, result, error)

        # Update in-memory storage
        self.task_results[task_id] = task_result

        # Update Redis if available
        if self.redis:
            try:
                task_data = task_result.to_dict()
                await self.redis.setex(f"task:{task_id}", 3600, json.dumps(task_data))
            except Exception as e:
                logger.warning(f"Failed to update task status in Redis: {e}")

    async def complete_task(self, task_id: str, result: Any):
        """Mark task as completed"""
        await self.update_task_status(task_id, TaskStatus.COMPLETED, result)
        logger.info(f"Task {task_id} completed successfully")

    async def fail_task(self, task_id: str, error: str):
        """Mark task as failed"""
        await self.update_task_status(task_id, TaskStatus.FAILED, error=error)
        logger.error(f"Task {task_id} failed: {error}")

    async def get_pending_tasks(self, limit: int = 10) -> List[str]:
        """Get pending tasks from queue"""
        if not self._initialized:
            await self.connect()

        try:
            if self.redis:
                # Get tasks from Redis list
                task_ids = await self.redis.lrange("job_parser_queue", 0, limit - 1)
                return task_ids
            elif self.nats:
                # NATS doesn't have built-in queue browsing
                # This would require a different approach
                logger.warning("Getting pending tasks not supported with NATS")
                return []

        except Exception as e:
            logger.error(f"Failed to get pending tasks: {e}")
            return []

    async def process_task(self, task_data: Dict[str, Any]) -> Any:
        """Process a task (to be implemented by worker)"""
        task_id = task_data["task_id"]
        task_type = task_data["task_type"]
        payload = task_data["payload"]

        try:
            await self.update_task_status(task_id, TaskStatus.PROCESSING)

            # This is where the actual task processing would happen
            # For now, just simulate processing
            if task_type == "parse_job":
                result = await self._process_parse_job(payload)
            else:
                raise ValueError(f"Unknown task type: {task_type}")

            await self.complete_task(task_id, result)
            return result

        except Exception as e:
            await self.fail_task(task_id, str(e))
            raise

    async def _process_parse_job(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process a job parsing task"""
        # This would integrate with the JobDescriptionParser
        # For now, return mock results
        await asyncio.sleep(1)  # Simulate processing time

        return {
            "job_id": payload.get("job_id"),
            "skills": ["Python", "JavaScript", "React"],
            "keywords": ["web development", "backend", "frontend"],
            "experience_level": "Mid Level",
            "education_level": "Bachelor's Degree",
            "confidence_scores": {
                "skills": 0.85,
                "keywords": 0.78,
                "experience": 0.92,
                "education": 0.88,
                "overall": 0.86,
            },
        }

    async def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Clean up old completed/failed tasks"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)

        if self.redis:
            try:
                # Get all task keys
                task_keys = await self.redis.keys("task:*")

                for key in task_keys:
                    task_data_str = await self.redis.get(key)
                    if task_data_str:
                        task_data = json.loads(task_data_str)
                        created_at = datetime.fromisoformat(task_data["created_at"])

                        if created_at < cutoff_time:
                            await self.redis.delete(key)

            except Exception as e:
                logger.error(f"Failed to cleanup old tasks: {e}")

        # Clean in-memory storage
        to_remove = []
        for task_id, task_result in self.task_results.items():
            if task_result.created_at < cutoff_time:
                to_remove.append(task_id)

        for task_id in to_remove:
            del self.task_results[task_id]

        logger.info(f"Cleaned up {len(to_remove)} old tasks")

    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        stats = {
            "total_tasks": len(self.task_results),
            "pending_tasks": 0,
            "processing_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
        }

        for task_result in self.task_results.values():
            if task_result.status == TaskStatus.PENDING:
                stats["pending_tasks"] += 1
            elif task_result.status == TaskStatus.PROCESSING:
                stats["processing_tasks"] += 1
            elif task_result.status == TaskStatus.COMPLETED:
                stats["completed_tasks"] += 1
            elif task_result.status == TaskStatus.FAILED:
                stats["failed_tasks"] += 1

        return stats
