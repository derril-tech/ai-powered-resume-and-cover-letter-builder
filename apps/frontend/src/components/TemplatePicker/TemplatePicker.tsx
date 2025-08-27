import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, CardMedia, CardActions, Button, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { CheckCircle, Warning, Error, Preview, Select } from '@mui/icons-material';

interface TemplatePickerProps {
    onSelect: (templateId: string) => void;
    selectedTemplateId?: string;
}

interface Template {
    id: string;
    name: string;
    style: 'modern' | 'classic' | 'minimalist';
    atsSafe: boolean;
    preview: string;
    description: string;
    features: string[];
    risks: string[];
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelect, selectedTemplateId }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [previewDialog, setPreviewDialog] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            // TODO: Call templates API
            const mockTemplates: Template[] = [
                {
                    id: '1',
                    name: 'Modern Professional',
                    style: 'modern',
                    atsSafe: true,
                    preview: '/api/templates/1/preview',
                    description: 'Clean, modern design with excellent ATS compatibility',
                    features: ['ATS-optimized', 'Professional layout', 'Easy to read', 'Mobile-friendly'],
                    risks: []
                },
                {
                    id: '2',
                    name: 'Classic Executive',
                    style: 'classic',
                    atsSafe: true,
                    preview: '/api/templates/2/preview',
                    description: 'Traditional executive style with proven track record',
                    features: ['Traditional design', 'Executive appeal', 'ATS-compatible', 'Print-ready'],
                    risks: []
                },
                {
                    id: '3',
                    name: 'Minimalist Clean',
                    style: 'minimalist',
                    atsSafe: true,
                    preview: '/api/templates/3/preview',
                    description: 'Minimalist design focusing on content over style',
                    features: ['Minimalist design', 'Content-focused', 'Fast loading', 'Clean typography'],
                    risks: []
                },
                {
                    id: '4',
                    name: 'Creative Portfolio',
                    style: 'modern',
                    atsSafe: false,
                    preview: '/api/templates/4/preview',
                    description: 'Creative design with visual elements',
                    features: ['Creative layout', 'Visual elements', 'Portfolio-style', 'Eye-catching'],
                    risks: ['May not parse well in ATS', 'Complex formatting', 'Potential compatibility issues']
                },
                {
                    id: '5',
                    name: 'Two-Column Layout',
                    style: 'modern',
                    atsSafe: false,
                    preview: '/api/templates/5/preview',
                    description: 'Two-column layout for better space utilization',
                    features: ['Two-column layout', 'Space efficient', 'Modern design', 'Visual hierarchy'],
                    risks: ['Column layout may confuse ATS', 'Text flow issues', 'Mobile compatibility concerns']
                }
            ];

            setTemplates(mockTemplates);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = (template: Template) => {
        setSelectedTemplate(template);
        onSelect(template.id);
    };

    const handlePreview = (template: Template) => {
        setSelectedTemplate(template);
        setPreviewDialog(true);
    };

    const getStyleColor = (style: string) => {
        switch (style) {
            case 'modern': return 'primary';
            case 'classic': return 'secondary';
            case 'minimalist': return 'success';
            default: return 'default';
        }
    };

    const getAtsSafeIcon = (atsSafe: boolean) => {
        return atsSafe ? <CheckCircle color="success" /> : <Warning color="warning" />;
    };

    const getAtsSafeColor = (atsSafe: boolean) => {
        return atsSafe ? 'success' : 'warning';
    };

    if (loading) {
        return (
            <Paper sx={{ p: 2 }}>
                <Typography>Loading templates...</Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Choose Your Template
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
                Select a template that matches your industry and career level. ATS-safe templates are recommended for most applications.
            </Alert>

            <Grid container spacing={3}>
                {templates.map(template => (
                    <Grid item xs={12} sm={6} md={4} key={template.id}>
                        <Card
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                border: selectedTemplateId === template.id ? '2px solid #1976d2' : '1px solid #e0e0e0'
                            }}
                        >
                            <CardMedia
                                component="img"
                                height="200"
                                image={template.preview}
                                alt={template.name}
                                sx={{ objectFit: 'cover' }}
                            />

                            <CardContent sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Typography variant="h6" component="h2">
                                        {template.name}
                                    </Typography>
                                    {getAtsSafeIcon(template.atsSafe)}
                                </Box>

                                <Chip
                                    label={template.style}
                                    color={getStyleColor(template.style)}
                                    size="small"
                                    sx={{ mb: 1 }}
                                />

                                <Chip
                                    label={template.atsSafe ? 'ATS Safe' : 'ATS Risk'}
                                    color={getAtsSafeColor(template.atsSafe)}
                                    variant="outlined"
                                    size="small"
                                    sx={{ ml: 1 }}
                                />

                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {template.description}
                                </Typography>

                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Features:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {template.features.map((feature, index) => (
                                            <Chip
                                                key={index}
                                                label={feature}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </Box>

                                {template.risks.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                            ATS Risks:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {template.risks.map((risk, index) => (
                                                <Typography key={index} variant="caption" color="warning.main">
                                                    • {risk}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>

                            <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                                <Button
                                    size="small"
                                    startIcon={<Preview />}
                                    onClick={() => handlePreview(template)}
                                >
                                    Preview
                                </Button>
                                <Button
                                    variant={selectedTemplateId === template.id ? "contained" : "outlined"}
                                    size="small"
                                    startIcon={<Select />}
                                    onClick={() => handleTemplateSelect(template)}
                                >
                                    {selectedTemplateId === template.id ? 'Selected' : 'Select'}
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Preview Dialog */}
            <Dialog
                open={previewDialog}
                onClose={() => setPreviewDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {selectedTemplate?.name} - Preview
                </DialogTitle>
                <DialogContent>
                    {selectedTemplate && (
                        <Box>
                            <img
                                src={selectedTemplate.preview}
                                alt={selectedTemplate.name}
                                style={{ width: '100%', height: 'auto' }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Template Details
                                </Typography>
                                <Typography variant="body2" paragraph>
                                    {selectedTemplate.description}
                                </Typography>

                                <Typography variant="subtitle2" gutterBottom>
                                    Features:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                    {selectedTemplate.features.map((feature, index) => (
                                        <Chip key={index} label={feature} size="small" />
                                    ))}
                                </Box>

                                {selectedTemplate.risks.length > 0 && (
                                    <>
                                        <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                            ATS Risks:
                                        </Typography>
                                        <Alert severity="warning" sx={{ mb: 2 }}>
                                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                {selectedTemplate.risks.map((risk, index) => (
                                                    <li key={index}>{risk}</li>
                                                ))}
                                            </ul>
                                        </Alert>
                                    </>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewDialog(false)}>Close</Button>
                    {selectedTemplate && (
                        <Button
                            variant="contained"
                            onClick={() => {
                                handleTemplateSelect(selectedTemplate);
                                setPreviewDialog(false);
                            }}
                        >
                            Select Template
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};
