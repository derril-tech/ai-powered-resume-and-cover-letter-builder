import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, CardActions, Button, Chip, Tabs, Tab, List, ListItem, ListItemText, ListItemIcon, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import { Compare, CheckCircle, Cancel, Visibility, Approval, Diff, History } from '@mui/icons-material';

interface ComparePageProps {
    projectId: string;
    resumeId: string;
}

interface Variant {
    id: string;
    name: string;
    version: number;
    status: 'draft' | 'optimized' | 'approved' | 'rejected';
    atsScore: number;
    createdAt: string;
    content: any;
    changes: Change[];
}

interface Change {
    id: string;
    type: 'added' | 'removed' | 'modified';
    section: string;
    field: string;
    oldValue?: string;
    newValue?: string;
    description: string;
}

interface DiffResult {
    section: string;
    changes: Change[];
}

export const ComparePage: React.FC<ComparePageProps> = ({ projectId, resumeId }) => {
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [diffResults, setDiffResults] = useState<DiffResult[]>([]);
    const [approvalDialog, setApprovalDialog] = useState(false);
    const [selectedVariantForApproval, setSelectedVariantForApproval] = useState<Variant | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVariants();
    }, [projectId, resumeId]);

    useEffect(() => {
        if (selectedVariants.length === 2) {
            generateDiff();
        }
    }, [selectedVariants]);

    const loadVariants = async () => {
        setLoading(true);
        try {
            // TODO: Call variants API
            const mockVariants: Variant[] = [
                {
                    id: '1',
                    name: 'Original Resume',
                    version: 1,
                    status: 'draft',
                    atsScore: 65,
                    createdAt: '2024-01-15T10:00:00Z',
                    content: { summary: 'Original summary...', experience: 'Original experience...' },
                    changes: []
                },
                {
                    id: '2',
                    name: 'AI Optimized v1',
                    version: 2,
                    status: 'optimized',
                    atsScore: 87,
                    createdAt: '2024-01-15T11:30:00Z',
                    content: { summary: 'Optimized summary...', experience: 'Enhanced experience...' },
                    changes: [
                        {
                            id: '1',
                            type: 'modified',
                            section: 'summary',
                            field: 'content',
                            oldValue: 'Original summary...',
                            newValue: 'Optimized summary...',
                            description: 'Enhanced summary with keywords'
                        }
                    ]
                },
                {
                    id: '3',
                    name: 'Final Approved',
                    version: 3,
                    status: 'approved',
                    atsScore: 92,
                    createdAt: '2024-01-15T14:00:00Z',
                    content: { summary: 'Final summary...', experience: 'Final experience...' },
                    changes: [
                        {
                            id: '2',
                            type: 'modified',
                            section: 'summary',
                            field: 'content',
                            oldValue: 'Optimized summary...',
                            newValue: 'Final summary...',
                            description: 'Final review and approval'
                        }
                    ]
                }
            ];

            setVariants(mockVariants);
        } catch (error) {
            console.error('Failed to load variants:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateDiff = async () => {
        if (selectedVariants.length !== 2) return;

        const [variant1, variant2] = selectedVariants.map(id =>
            variants.find(v => v.id === id)
        ).filter(Boolean) as Variant[];

        // TODO: Call diff API
        const mockDiffResults: DiffResult[] = [
            {
                section: 'summary',
                changes: [
                    {
                        id: '1',
                        type: 'modified',
                        section: 'summary',
                        field: 'content',
                        oldValue: variant1.content.summary,
                        newValue: variant2.content.summary,
                        description: 'Enhanced with keywords and improved clarity'
                    }
                ]
            },
            {
                section: 'experience',
                changes: [
                    {
                        id: '2',
                        type: 'added',
                        section: 'experience',
                        field: 'bullet_points',
                        newValue: '• Led cross-functional team of 8 developers',
                        description: 'Added STAR method bullet points'
                    }
                ]
            }
        ];

        setDiffResults(mockDiffResults);
    };

    const handleVariantSelect = (variantId: string) => {
        if (selectedVariants.includes(variantId)) {
            setSelectedVariants(selectedVariants.filter(id => id !== variantId));
        } else if (selectedVariants.length < 2) {
            setSelectedVariants([...selectedVariants, variantId]);
        }
    };

    const handleApproval = (variant: Variant) => {
        setSelectedVariantForApproval(variant);
        setApprovalDialog(true);
    };

    const confirmApproval = async () => {
        if (!selectedVariantForApproval) return;

        try {
            // TODO: Call approval API
            console.log('Approving variant:', selectedVariantForApproval.id);
            setApprovalDialog(false);
            setSelectedVariantForApproval(null);
            // Reload variants to update status
            await loadVariants();
        } catch (error) {
            console.error('Failed to approve variant:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'success';
            case 'optimized': return 'warning';
            case 'rejected': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle />;
            case 'optimized': return <Approval />;
            case 'rejected': return <Cancel />;
            default: return <History />;
        }
    };

    const getChangeIcon = (type: string) => {
        switch (type) {
            case 'added': return <CheckCircle color="success" />;
            case 'removed': return <Cancel color="error" />;
            case 'modified': return <Diff color="warning" />;
            default: return <Visibility />;
        }
    };

    if (loading) {
        return (
            <Paper sx={{ p: 2 }}>
                <Typography>Loading variants...</Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>
                Compare Variants
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
                Select up to 2 variants to compare their differences and approve changes.
            </Alert>

            {/* Variant Selection */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Select Variants to Compare
                </Typography>
                <Grid container spacing={2}>
                    {variants.map(variant => (
                        <Grid item xs={12} sm={6} md={4} key={variant.id}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    border: selectedVariants.includes(variant.id) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                    opacity: selectedVariants.length === 2 && !selectedVariants.includes(variant.id) ? 0.5 : 1
                                }}
                                onClick={() => handleVariantSelect(variant.id)}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6">{variant.name}</Typography>
                                        {getStatusIcon(variant.status)}
                                    </Box>

                                    <Chip
                                        label={variant.status}
                                        color={getStatusColor(variant.status)}
                                        size="small"
                                        sx={{ mb: 1 }}
                                    />

                                    <Typography variant="body2" color="text.secondary">
                                        Version {variant.version} • ATS Score: {variant.atsScore}%
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(variant.createdAt).toLocaleDateString()}
                                    </Typography>
                                </CardContent>

                                <CardActions>
                                    <Button
                                        size="small"
                                        startIcon={<Visibility />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // TODO: Open variant preview
                                        }}
                                    >
                                        Preview
                                    </Button>
                                    {variant.status === 'optimized' && (
                                        <Button
                                            size="small"
                                            startIcon={<Approval />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApproval(variant);
                                            }}
                                        >
                                            Approve
                                        </Button>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Comparison Results */}
            {selectedVariants.length === 2 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Comparison Results
                    </Typography>

                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                        <Tab label="Changes Summary" />
                        <Tab label="Detailed Diff" />
                        <Tab label="ATS Analysis" />
                    </Tabs>

                    {activeTab === 0 && (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                Changes Summary
                            </Typography>
                            <List>
                                {diffResults.map((section, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            <Diff />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={`${section.section} (${section.changes.length} changes)`}
                                            secondary={section.changes.map(change => change.description).join(', ')}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                Detailed Differences
                            </Typography>
                            {diffResults.map((section, sectionIndex) => (
                                <Box key={sectionIndex} sx={{ mb: 3 }}>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        {section.section}
                                    </Typography>
                                    {section.changes.map((change, changeIndex) => (
                                        <Box key={changeIndex} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                {getChangeIcon(change.type)}
                                                <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                                                    {change.type}
                                                </Typography>
                                                <Chip label={change.field} size="small" variant="outlined" />
                                            </Box>

                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {change.description}
                                            </Typography>

                                            {change.oldValue && (
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography variant="caption" color="error">Removed:</Typography>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', backgroundColor: '#ffebee', p: 1, borderRadius: 1 }}>
                                                        {change.oldValue}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {change.newValue && (
                                                <Box>
                                                    <Typography variant="caption" color="success">Added:</Typography>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', backgroundColor: '#e8f5e8', p: 1, borderRadius: 1 }}>
                                                        {change.newValue}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                    )}

                    {activeTab === 2 && (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                ATS Score Comparison
                            </Typography>
                            <Grid container spacing={2}>
                                {selectedVariants.map(variantId => {
                                    const variant = variants.find(v => v.id === variantId);
                                    if (!variant) return null;

                                    return (
                                        <Grid item xs={6} key={variantId}>
                                            <Card>
                                                <CardContent>
                                                    <Typography variant="h6">{variant.name}</Typography>
                                                    <Typography variant="h3" color="primary">
                                                        {variant.atsScore}%
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        ATS Compatibility Score
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Approval Dialog */}
            <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
                <DialogTitle>Approve Variant</DialogTitle>
                <DialogContent>
                    {selectedVariantForApproval && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                Are you sure you want to approve "{selectedVariantForApproval.name}"?
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This will mark the variant as approved and make it the current version.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
                    <Button onClick={confirmApproval} variant="contained" color="success">
                        Approve
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
