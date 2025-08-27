import React, { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Chip, FormControl, InputLabel, Select, MenuItem, Alert, LinearProgress } from '@mui/material';
import { Edit, Save, Refresh, Palette, Psychology } from '@mui/icons-material';

interface CoverLetterEditorProps {
    jobId: string;
    resumeId: string;
    content?: string;
    onSave: (content: string) => void;
}

interface Tone {
    id: string;
    name: string;
    description: string;
    examples: string[];
}

export const CoverLetterEditor: React.FC<CoverLetterEditorProps> = ({
    jobId,
    resumeId,
    content = '',
    onSave
}) => {
    const [currentContent, setCurrentContent] = useState(content);
    const [selectedTone, setSelectedTone] = useState<string>('professional');
    const [wordCount, setWordCount] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const tones: Tone[] = [
        {
            id: 'professional',
            name: 'Professional',
            description: 'Formal and business-like tone',
            examples: ['I am writing to express my interest...', 'My experience aligns perfectly...']
        },
        {
            id: 'enthusiastic',
            name: 'Enthusiastic',
            description: 'Energetic and passionate tone',
            examples: ['I am thrilled to apply for...', 'I am excited about the opportunity...']
        },
        {
            id: 'confident',
            name: 'Confident',
            description: 'Assured and self-assured tone',
            examples: ['I am confident that my skills...', 'My track record demonstrates...']
        },
        {
            id: 'conversational',
            name: 'Conversational',
            description: 'Friendly and approachable tone',
            examples: ['I\'d love to join your team...', 'I think we\'d work great together...']
        },
        {
            id: 'creative',
            name: 'Creative',
            description: 'Innovative and imaginative tone',
            examples: ['Imagine a world where...', 'Let\'s build something amazing...']
        }
    ];

    useEffect(() => {
        setCurrentContent(content);
    }, [content]);

    useEffect(() => {
        const words = currentContent.trim().split(/\s+/).filter(word => word.length > 0);
        setWordCount(words.length);
    }, [currentContent]);

    const handleContentChange = (value: string) => {
        setCurrentContent(value);
    };

    const generateCoverLetter = async () => {
        setIsGenerating(true);
        try {
            // TODO: Call cover letter worker API
            const mockGeneratedContent = `Dear Hiring Manager,

I am writing to express my interest in the Software Engineer position at your company. With my background in full-stack development and passion for creating innovative solutions, I believe I would be a valuable addition to your team.

My experience includes developing scalable web applications using React and Node.js, implementing CI/CD pipelines, and collaborating with cross-functional teams to deliver high-quality products. I am particularly excited about the opportunity to work on challenging projects that make a real impact.

I am confident that my technical skills, problem-solving abilities, and collaborative approach would enable me to contribute effectively to your organization. I look forward to discussing how my background and skills align with your needs.

Thank you for considering my application.

Best regards,
[Your Name]`;

            setCurrentContent(mockGeneratedContent);
        } catch (error) {
            console.error('Failed to generate cover letter:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const regenerateWithTone = async () => {
        setIsGenerating(true);
        try {
            // TODO: Call cover letter worker API with specific tone
            const toneExamples = tones.find(t => t.id === selectedTone)?.examples || [];
            const mockRegeneratedContent = `Dear Hiring Manager,

${toneExamples[0]} the Software Engineer position at your company. ${toneExamples[1]} with the role requirements and I am excited about the opportunity to contribute to your team.

My experience includes developing scalable web applications using React and Node.js, implementing CI/CD pipelines, and collaborating with cross-functional teams to deliver high-quality products. I am particularly excited about the opportunity to work on challenging projects that make a real impact.

I am confident that my technical skills, problem-solving abilities, and collaborative approach would enable me to contribute effectively to your organization. I look forward to discussing how my background and skills align with your needs.

Thank you for considering my application.

Best regards,
[Your Name]`;

            setCurrentContent(mockRegeneratedContent);
        } catch (error) {
            console.error('Failed to regenerate cover letter:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(currentContent);
        } catch (error) {
            console.error('Failed to save cover letter:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const getWordCountColor = () => {
        if (wordCount < 200) return 'error';
        if (wordCount > 400) return 'warning';
        return 'success';
    };

    const getWordCountMessage = () => {
        if (wordCount < 200) return 'Too short - aim for 200-400 words';
        if (wordCount > 400) return 'Too long - aim for 200-400 words';
        return 'Perfect length!';
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Header */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Cover Letter Editor
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            onClick={generateCoverLetter}
                            disabled={isGenerating}
                            startIcon={<Refresh />}
                        >
                            Generate
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            disabled={isSaving}
                            startIcon={<Save />}
                        >
                            Save
                        </Button>
                    </Box>
                </Box>

                {/* Tone Selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="subtitle2">Tone:</Typography>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Tone</InputLabel>
                        <Select
                            value={selectedTone}
                            label="Tone"
                            onChange={(e) => setSelectedTone(e.target.value)}
                        >
                            {tones.map(tone => (
                                <MenuItem key={tone.id} value={tone.id}>
                                    <Box>
                                        <Typography variant="body2">{tone.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {tone.description}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={regenerateWithTone}
                        disabled={isGenerating}
                        startIcon={<Palette />}
                    >
                        Regenerate with Tone
                    </Button>
                </Box>

                {/* Word Count */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                        label={`${wordCount} words`}
                        color={getWordCountColor()}
                        variant="outlined"
                    />
                    <Typography variant="body2" color={getWordCountColor()}>
                        {getWordCountMessage()}
                    </Typography>
                </Box>
            </Paper>

            {/* Editor */}
            <Paper sx={{ flex: 1, p: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    multiline
                    rows={25}
                    value={currentContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Your cover letter content will appear here..."
                    variant="outlined"
                    sx={{ height: '100%' }}
                />
            </Paper>

            {/* Tone Examples */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Tone Examples
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {tones.find(t => t.id === selectedTone)?.examples.map((example, index) => (
                        <Chip
                            key={index}
                            label={example}
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                const newContent = currentContent + '\n\n' + example;
                                setCurrentContent(newContent);
                            }}
                            clickable
                        />
                    ))}
                </Box>
            </Paper>

            {/* Loading Overlay */}
            {isGenerating && (
                <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
                    <LinearProgress />
                    <Alert severity="info" sx={{ borderRadius: 0 }}>
                        Generating cover letter with {tones.find(t => t.id === selectedTone)?.name.toLowerCase()} tone...
                    </Alert>
                </Box>
            )}
        </Box>
    );
};
