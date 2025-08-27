# Created automatically by Cursor AI(2024 - 12 - 19)

import React, { useState, useCallback } from 'react';
import { AccessibilityAuditor, AccessibilityReport, AccessibilityIssue } from '../../utils/accessibility/accessibility-auditor';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemText,
    Chip,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    ExpandMore,
    Error,
    Warning,
    Info,
    Download,
    Refresh,
    Accessibility,
    CheckCircle
} from '@mui/icons-material';

interface AccessibilityAuditorProps {
    onReportGenerated?: (report: AccessibilityReport) => void;
}

export const AccessibilityAuditorComponent: React.FC<AccessibilityAuditorProps> = ({
    onReportGenerated
}) => {
    const [report, setReport] = useState<AccessibilityReport | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAudit = useCallback(async () => {
        setIsRunning(true);
        setError(null);

        try {
            const auditor = new AccessibilityAuditor();
            const auditReport = await auditor.auditPage();

            setReport(auditReport);
            onReportGenerated?.(auditReport);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to run accessibility audit');
        } finally {
            setIsRunning(false);
        }
    }, [onReportGenerated]);

    const downloadReport = useCallback((format: 'json' | 'html' | 'csv') => {
        if (!report) return;

        const auditor = new AccessibilityAuditor();
        const reportContent = auditor.generateReport(format);
        const blob = new Blob([reportContent], {
            type: format === 'json' ? 'application/json' :
                format === 'html' ? 'text/html' : 'text/csv'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [report]);

    const getIssueIcon = (type: string) => {
        switch (type) {
            case 'error':
                return <Error color="error" />;
            case 'warning':
                return <Warning color="warning" />;
            case 'info':
                return <Info color="info" />;
            default:
                return <Info />;
        }
    };

    const getIssueColor = (type: string) => {
        switch (type) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'default';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'success';
        if (score >= 70) return 'warning';
        return 'error';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 50) return 'Fair';
        return 'Poor';
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 2 }}>
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Accessibility />
                            Accessibility Auditor
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                onClick={runAudit}
                                disabled={isRunning}
                                startIcon={isRunning ? <CircularProgress size={20} /> : <Refresh />}
                            >
                                {isRunning ? 'Running Audit...' : 'Run Audit'}
                            </Button>
                            {report && (
                                <Tooltip title="Download JSON Report">
                                    <IconButton onClick={() => downloadReport('json')}>
                                        <Download />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {report && (
                        <Box>
                            {/* Summary Card */}
                            <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="h6">Audit Summary</Typography>
                                        <Chip
                                            label={`${report.summary.score}/100`}
                                            color={getScoreColor(report.summary.score) as any}
                                            icon={<CheckCircle />}
                                        />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {getScoreLabel(report.summary.score)} accessibility score
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <Chip
                                            label={`${report.summary.errors} Errors`}
                                            color="error"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`${report.summary.warnings} Warnings`}
                                            color="warning"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`${report.summary.info} Info`}
                                            color="info"
                                            variant="outlined"
                                        />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                        URL: {report.url}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Timestamp: {report.timestamp.toLocaleString()}
                                    </Typography>
                                </CardContent>
                            </Card>

                            {/* Issues List */}
                            {report.issues.length > 0 ? (
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2 }}>
                                            Issues Found ({report.issues.length})
                                        </Typography>

                                        <List>
                                            {report.issues.map((issue: AccessibilityIssue, index: number) => (
                                                <ListItem key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                {getIssueIcon(issue.type)}
                                                                <Typography variant="subtitle1" component="span">
                                                                    {issue.message}
                                                                </Typography>
                                                                <Chip
                                                                    label={issue.impact}
                                                                    size="small"
                                                                    color={getIssueColor(issue.type) as any}
                                                                    variant="outlined"
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Box>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    <strong>Element:</strong> {issue.element}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    <strong>Code:</strong> {issue.code}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    <strong>Help:</strong> {issue.help}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Alert severity="success" icon={<CheckCircle />}>
                                    No accessibility issues found! Your page meets WCAG 2.1 AA standards.
                                </Alert>
                            )}

                            {/* Download Options */}
                            {report && (
                                <Card sx={{ mt: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2 }}>
                                            Download Report
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Button
                                                variant="outlined"
                                                onClick={() => downloadReport('json')}
                                                startIcon={<Download />}
                                            >
                                                JSON
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => downloadReport('html')}
                                                startIcon={<Download />}
                                            >
                                                HTML
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => downloadReport('csv')}
                                                startIcon={<Download />}
                                            >
                                                CSV
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            )}
                        </Box>
                    )}

                    {!report && !isRunning && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Accessibility sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                Ready to Audit
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Click "Run Audit" to check this page for accessibility issues
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};
