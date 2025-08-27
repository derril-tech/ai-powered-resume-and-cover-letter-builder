import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, LinearProgress, Chip, List, ListItem, ListItemText, ListItemIcon, Alert } from '@mui/material';
import { CheckCircle, Error, Warning, TrendingUp, TrendingDown, Speed, Psychology } from '@mui/icons-material';

interface ScorePanelProps {
    variantId: string;
}

interface ATSMetrics {
    overallScore: number;
    keywordMatch: number;
    readability: number;
    length: number;
    format: number;
}

interface Gap {
    id: string;
    category: string;
    skill: string;
    importance: 'high' | 'medium' | 'low';
    suggestion: string;
}

interface ReadabilityMetric {
    name: string;
    score: number;
    grade: string;
    description: string;
}

export const ScorePanel: React.FC<ScorePanelProps> = ({ variantId }) => {
    const [atsMetrics, setAtsMetrics] = useState<ATSMetrics | null>(null);
    const [gaps, setGaps] = useState<Gap[]>([]);
    const [readabilityMetrics, setReadabilityMetrics] = useState<ReadabilityMetric[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadScoreData();
    }, [variantId]);

    const loadScoreData = async () => {
        setLoading(true);
        try {
            // TODO: Call ATS check worker API
            const mockAtsMetrics: ATSMetrics = {
                overallScore: 87,
                keywordMatch: 92,
                readability: 78,
                length: 85,
                format: 95
            };

            const mockGaps: Gap[] = [
                {
                    id: '1',
                    category: 'Technical Skills',
                    skill: 'Docker',
                    importance: 'high',
                    suggestion: 'Add Docker containerization experience to skills section'
                },
                {
                    id: '2',
                    category: 'Soft Skills',
                    skill: 'Leadership',
                    importance: 'medium',
                    suggestion: 'Include team leadership examples in experience section'
                },
                {
                    id: '3',
                    category: 'Certifications',
                    skill: 'AWS Certified',
                    importance: 'low',
                    suggestion: 'Consider adding relevant certifications'
                }
            ];

            const mockReadabilityMetrics: ReadabilityMetric[] = [
                {
                    name: 'Flesch-Kincaid',
                    score: 78,
                    grade: 'B+',
                    description: 'Good readability for professional audience'
                },
                {
                    name: 'SMOG Index',
                    score: 8.2,
                    grade: 'A',
                    description: 'Appropriate complexity level'
                },
                {
                    name: 'Coleman-Liau',
                    score: 12.1,
                    grade: 'B',
                    description: 'Slightly complex, consider simplifying'
                }
            ];

            setAtsMetrics(mockAtsMetrics);
            setGaps(mockGaps);
            setReadabilityMetrics(mockReadabilityMetrics);
        } catch (error) {
            console.error('Failed to load score data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'success';
        if (score >= 80) return 'warning';
        return 'error';
    };

    const getGapIcon = (importance: string) => {
        switch (importance) {
            case 'high': return <Error color="error" />;
            case 'medium': return <Warning color="warning" />;
            case 'low': return <CheckCircle color="success" />;
            default: return <Warning />;
        }
    };

    const getGapColor = (importance: string) => {
        switch (importance) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Paper sx={{ p: 2 }}>
                <Typography>Loading score data...</Typography>
            </Paper>
        );
    }

    if (!atsMetrics) {
        return (
            <Paper sx={{ p: 2 }}>
                <Alert severity="error">Failed to load score data</Alert>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100vh', overflow: 'auto' }}>
            {/* ATS Score Overview */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    ATS Score Overview
                </Typography>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h3" color={getScoreColor(atsMetrics.overallScore)}>
                        {atsMetrics.overallScore}%
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Overall ATS Compatibility
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Keyword Match</Typography>
                        <Typography variant="body2">{atsMetrics.keywordMatch}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={atsMetrics.keywordMatch}
                        color={getScoreColor(atsMetrics.keywordMatch)}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Readability</Typography>
                        <Typography variant="body2">{atsMetrics.readability}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={atsMetrics.readability}
                        color={getScoreColor(atsMetrics.readability)}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Length</Typography>
                        <Typography variant="body2">{atsMetrics.length}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={atsMetrics.length}
                        color={getScoreColor(atsMetrics.length)}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Format</Typography>
                        <Typography variant="body2">{atsMetrics.format}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={atsMetrics.format}
                        color={getScoreColor(atsMetrics.format)}
                    />
                </Box>
            </Paper>

            {/* Skill Gaps */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Skill Gaps Analysis
                </Typography>
                <List dense>
                    {gaps.map(gap => (
                        <ListItem key={gap.id} sx={{ px: 0 }}>
                            <ListItemIcon>
                                {getGapIcon(gap.importance)}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" fontWeight="bold">
                                            {gap.skill}
                                        </Typography>
                                        <Chip
                                            label={gap.importance}
                                            size="small"
                                            color={getGapColor(gap.importance)}
                                            variant="outlined"
                                        />
                                    </Box>
                                }
                                secondary={
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {gap.category}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            {gap.suggestion}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            {/* Readability Metrics */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Readability Analysis
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {readabilityMetrics.map(metric => (
                        <Box key={metric.name} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2">{metric.name}</Typography>
                                <Chip
                                    label={metric.grade}
                                    size="small"
                                    color={metric.grade === 'A' ? 'success' : metric.grade === 'B' ? 'warning' : 'error'}
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {metric.description}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* Recommendations */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Recommendations
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemIcon>
                            <TrendingUp color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Add more keywords from job description" />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <Speed color="warning" />
                        </ListItemIcon>
                        <ListItemText primary="Simplify complex sentences for better readability" />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <Psychology color="info" />
                        </ListItemIcon>
                        <ListItemText primary="Include specific metrics and achievements" />
                    </ListItem>
                </List>
            </Paper>
        </Box>
    );
};
