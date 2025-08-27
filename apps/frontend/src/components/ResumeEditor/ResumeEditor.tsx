import React, { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Add, Edit, Star, Lightbulb, AutoAwesome } from '@mui/icons-material';

interface ResumeEditorProps {
    variantId: string;
    content: any;
    onSave: (content: any) => void;
}

interface BulletSuggestion {
    id: string;
    text: string;
    type: 'STAR' | 'keyword' | 'achievement';
    confidence: number;
}

interface StarPrompt {
    situation: string;
    task: string;
    action: string;
    result: string;
}

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ variantId, content, onSave }) => {
    const [currentContent, setCurrentContent] = useState(content);
    const [bulletSuggestions, setBulletSuggestions] = useState<BulletSuggestion[]>([]);
    const [starPrompts, setStarPrompts] = useState<StarPrompt[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>('summary');
    const [isGenerating, setIsGenerating] = useState(false);

    const sections = ['contact', 'summary', 'experience', 'education', 'skills', 'projects'];

    useEffect(() => {
        setCurrentContent(content);
    }, [content]);

    const handleContentChange = (section: string, value: string) => {
        setCurrentContent(prev => ({
            ...prev,
            [section]: value
        }));
    };

    const generateBulletSuggestions = async (context: string) => {
        setIsGenerating(true);
        try {
            // TODO: Call optimize worker API for bullet suggestions
            const mockSuggestions: BulletSuggestion[] = [
                {
                    id: '1',
                    text: 'Led cross-functional team of 8 developers to deliver mobile app ahead of schedule',
                    type: 'STAR',
                    confidence: 0.95
                },
                {
                    id: '2',
                    text: 'Implemented CI/CD pipeline reducing deployment time by 60%',
                    type: 'achievement',
                    confidence: 0.88
                }
            ];
            setBulletSuggestions(mockSuggestions);
        } catch (error) {
            console.error('Failed to generate bullet suggestions:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateStarPrompts = async (experience: string) => {
        setIsGenerating(true);
        try {
            // TODO: Call optimize worker API for STAR prompts
            const mockPrompts: StarPrompt[] = [
                {
                    situation: 'Team was struggling with manual deployment process',
                    task: 'Implement automated CI/CD pipeline',
                    action: 'Researched tools, designed architecture, led implementation',
                    result: 'Reduced deployment time by 60%, improved reliability'
                }
            ];
            setStarPrompts(mockPrompts);
        } catch (error) {
            console.error('Failed to generate STAR prompts:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const addBulletSuggestion = (suggestion: BulletSuggestion) => {
        const currentBullets = currentContent[selectedSection]?.bullets || [];
        setCurrentContent(prev => ({
            ...prev,
            [selectedSection]: {
                ...prev[selectedSection],
                bullets: [...currentBullets, suggestion.text]
            }
        }));
    };

    const saveContent = () => {
        onSave(currentContent);
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, height: '100vh' }}>
            {/* Main Editor */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Resume Editor
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {sections.map(section => (
                            <Chip
                                key={section}
                                label={section}
                                variant={selectedSection === section ? 'filled' : 'outlined'}
                                onClick={() => setSelectedSection(section)}
                                clickable
                            />
                        ))}
                    </Box>
                </Paper>

                <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={20}
                        value={currentContent[selectedSection] || ''}
                        onChange={(e) => handleContentChange(selectedSection, e.target.value)}
                        placeholder={`Enter your ${selectedSection} content...`}
                        variant="outlined"
                    />
                </Paper>

                <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={saveContent}
                        startIcon={<Edit />}
                    >
                        Save Changes
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => generateBulletSuggestions(currentContent[selectedSection])}
                        startIcon={<Lightbulb />}
                        disabled={isGenerating}
                    >
                        Generate Bullets
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => generateStarPrompts(currentContent[selectedSection])}
                        startIcon={<Star />}
                        disabled={isGenerating}
                    >
                        STAR Prompts
                    </Button>
                </Box>
            </Box>

            {/* Suggestions Panel */}
            <Box sx={{ width: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Bullet Suggestions */}
                <Paper sx={{ p: 2, flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                        Bullet Suggestions
                    </Typography>
                    {bulletSuggestions.map(suggestion => (
                        <Box key={suggestion.id} sx={{ mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                {suggestion.text}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Chip
                                    label={suggestion.type}
                                    size="small"
                                    color={suggestion.type === 'STAR' ? 'primary' : 'default'}
                                />
                                <Tooltip title="Add to resume">
                                    <IconButton
                                        size="small"
                                        onClick={() => addBulletSuggestion(suggestion)}
                                    >
                                        <Add />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    ))}
                </Paper>

                {/* STAR Prompts */}
                <Paper sx={{ p: 2, flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                        STAR Prompts
                    </Typography>
                    {starPrompts.map((prompt, index) => (
                        <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Typography variant="subtitle2" color="primary">Situation:</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>{prompt.situation}</Typography>
                            <Typography variant="subtitle2" color="primary">Task:</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>{prompt.task}</Typography>
                            <Typography variant="subtitle2" color="primary">Action:</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>{prompt.action}</Typography>
                            <Typography variant="subtitle2" color="primary">Result:</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>{prompt.result}</Typography>
                        </Box>
                    ))}
                </Paper>
            </Box>
        </Box>
    );
};
