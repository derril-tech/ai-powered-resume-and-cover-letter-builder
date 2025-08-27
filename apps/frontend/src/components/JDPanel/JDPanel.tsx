import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Chip, List, ListItem, ListItemText, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore, Work, School, Psychology, Code, Business } from '@mui/icons-material';

interface JDPanelProps {
    jobId: string;
}

interface ParsedEntity {
    id: string;
    type: 'skill' | 'company' | 'title' | 'requirement' | 'benefit';
    text: string;
    confidence: number;
    category?: string;
}

interface Keyword {
    id: string;
    text: string;
    importance: 'high' | 'medium' | 'low';
    frequency: number;
    category: string;
}

export const JDPanel: React.FC<JDPanelProps> = ({ jobId }) => {
    const [parsedEntities, setParsedEntities] = useState<ParsedEntity[]>([]);
    const [keywords, setKeywords] = useState<Keyword[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadJobData();
    }, [jobId]);

    const loadJobData = async () => {
        setLoading(true);
        try {
            // TODO: Call JD parser worker API
            const mockEntities: ParsedEntity[] = [
                { id: '1', type: 'skill', text: 'React', confidence: 0.95, category: 'Frontend' },
                { id: '2', type: 'skill', text: 'Node.js', confidence: 0.92, category: 'Backend' },
                { id: '3', type: 'company', text: 'Tech Corp', confidence: 0.98 },
                { id: '4', type: 'title', text: 'Senior Software Engineer', confidence: 0.96 },
                { id: '5', type: 'requirement', text: '5+ years experience', confidence: 0.89 },
                { id: '6', type: 'benefit', text: 'Remote work', confidence: 0.87 }
            ];

            const mockKeywords: Keyword[] = [
                { id: '1', text: 'JavaScript', importance: 'high', frequency: 8, category: 'Programming' },
                { id: '2', text: 'React', importance: 'high', frequency: 6, category: 'Framework' },
                { id: '3', text: 'API', importance: 'medium', frequency: 4, category: 'Backend' },
                { id: '4', text: 'Agile', importance: 'medium', frequency: 3, category: 'Methodology' },
                { id: '5', text: 'Testing', importance: 'low', frequency: 2, category: 'Quality' }
            ];

            setParsedEntities(mockEntities);
            setKeywords(mockKeywords);
        } catch (error) {
            console.error('Failed to load job data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case 'skill': return <Code />;
            case 'company': return <Business />;
            case 'title': return <Work />;
            case 'requirement': return <Psychology />;
            case 'benefit': return <School />;
            default: return <Work />;
        }
    };

    const getImportanceColor = (importance: string) => {
        switch (importance) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    const groupedEntities = parsedEntities.reduce((acc, entity) => {
        if (!acc[entity.type]) acc[entity.type] = [];
        acc[entity.type].push(entity);
        return acc;
    }, {} as Record<string, ParsedEntity[]>);

    const groupedKeywords = keywords.reduce((acc, keyword) => {
        if (!acc[keyword.category]) acc[keyword.category] = [];
        acc[keyword.category].push(keyword);
        return acc;
    }, {} as Record<string, Keyword[]>);

    if (loading) {
        return (
            <Paper sx={{ p: 2 }}>
                <Typography>Loading job data...</Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100vh', overflow: 'auto' }}>
            {/* Parsed Entities */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Parsed Entities
                </Typography>
                {Object.entries(groupedEntities).map(([type, entities]) => (
                    <Accordion key={type} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getEntityIcon(type)}
                                <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                                    {type}s ({entities.length})
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List dense>
                                {entities.map(entity => (
                                    <ListItem key={entity.id} sx={{ py: 0.5 }}>
                                        <ListItemText
                                            primary={entity.text}
                                            secondary={`Confidence: ${(entity.confidence * 100).toFixed(0)}%`}
                                        />
                                        {entity.category && (
                                            <Chip
                                                label={entity.category}
                                                size="small"
                                                variant="outlined"
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Paper>

            {/* Keywords */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Keywords & Skills
                </Typography>
                {Object.entries(groupedKeywords).map(([category, categoryKeywords]) => (
                    <Accordion key={category} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="subtitle1">
                                {category} ({categoryKeywords.length})
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {categoryKeywords.map(keyword => (
                                    <Chip
                                        key={keyword.id}
                                        label={`${keyword.text} (${keyword.frequency})`}
                                        color={getImportanceColor(keyword.importance)}
                                        variant="outlined"
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Paper>

            {/* Summary Stats */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Summary
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                        label={`${parsedEntities.length} Entities`}
                        variant="outlined"
                        icon={<Work />}
                    />
                    <Chip
                        label={`${keywords.length} Keywords`}
                        variant="outlined"
                        icon={<Code />}
                    />
                    <Chip
                        label={`${keywords.filter(k => k.importance === 'high').length} High Priority`}
                        color="error"
                        variant="outlined"
                    />
                </Box>
            </Paper>
        </Box>
    );
};
