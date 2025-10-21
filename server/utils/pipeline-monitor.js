/**
 * Pipeline Monitoring & Debug Dashboard
 * Provides real-time tracking of documentation generation stages
 */
class PipelineMonitor {
    reports = new Map();
    /**
     * Initialize a new pipeline tracking session
     */
    startPipeline(sessionId) {
        const report = {
            sessionId,
            stages: this.initializeStages(),
            overallQuality: 0,
            startTime: Date.now(),
            sourcesUsed: 0,
            sourcesMissing: [],
            recommendations: [],
        };
        this.reports.set(sessionId, report);
        console.log(`📊 Pipeline started: ${sessionId}`);
        return report;
    }
    /**
     * Initialize all pipeline stages
     */
    initializeStages() {
        return [
            {
                id: 1,
                name: 'Site Discovery',
                description: 'Crawling website and mapping content',
                status: 'pending',
                progress: 0,
            },
            {
                id: 2,
                name: 'Content Extraction',
                description: 'Extracting content from multiple pages',
                status: 'pending',
                progress: 0,
            },
            {
                id: 3,
                name: 'External Research',
                description: 'Gathering insights from Stack Overflow, GitHub, etc.',
                status: 'pending',
                progress: 0,
            },
            {
                id: 4,
                name: 'Source Quality Scoring',
                description: 'Validating and scoring information sources',
                status: 'pending',
                progress: 0,
            },
            {
                id: 5,
                name: 'AI Synthesis',
                description: 'Generating comprehensive documentation',
                status: 'pending',
                progress: 0,
            },
            {
                id: 6,
                name: 'Quality Validation',
                description: 'Verifying content accuracy and completeness',
                status: 'pending',
                progress: 0,
            },
            {
                id: 7,
                name: 'Formatting & Export',
                description: 'Finalizing documentation output',
                status: 'pending',
                progress: 0,
            },
        ];
    }
    /**
     * Update a specific stage
     */
    updateStage(sessionId, stageId, updates) {
        const report = this.reports.get(sessionId);
        if (!report)
            return;
        const stage = report.stages.find(s => s.id === stageId);
        if (!stage)
            return;
        // Update stage
        Object.assign(stage, updates);
        // Set timestamps
        if (updates.status === 'in_progress' && !stage.startTime) {
            stage.startTime = Date.now();
        }
        if (updates.status === 'completed' || updates.status === 'failed') {
            stage.endTime = Date.now();
        }
        console.log(`📝 Stage ${stageId} (${stage.name}): ${updates.status || stage.status} - ${updates.progress || stage.progress}%`);
        // Emit to listeners (WebSocket, etc.)
        this.emitUpdate(sessionId, stage);
    }
    /**
     * Mark stage as failed with error
     */
    failStage(sessionId, stageId, error) {
        this.updateStage(sessionId, stageId, {
            status: 'failed',
            error,
            progress: 0,
        });
    }
    /**
     * Mark stage as partially completed
     */
    partialStage(sessionId, stageId, progress, warnings) {
        const report = this.reports.get(sessionId);
        if (!report)
            return;
        const stage = report.stages.find(s => s.id === stageId);
        if (!stage)
            return;
        this.updateStage(sessionId, stageId, {
            status: 'partial',
            progress,
            details: {
                ...stage.details,
                warnings,
            },
        });
    }
    /**
     * Add source attribution
     */
    addSource(sessionId, stageId, source) {
        const report = this.reports.get(sessionId);
        if (!report)
            return;
        const stage = report.stages.find(s => s.id === stageId);
        if (!stage)
            return;
        if (!stage.details)
            stage.details = {};
        if (!stage.details.sources)
            stage.details.sources = [];
        stage.details.sources.push(source);
        if (source.used) {
            report.sourcesUsed++;
        }
    }
    /**
     * Complete pipeline and calculate final quality score
     */
    completePipeline(sessionId) {
        const report = this.reports.get(sessionId);
        if (!report)
            return undefined;
        report.endTime = Date.now();
        report.totalDuration = report.endTime - report.startTime;
        // Calculate overall quality based on stage completion
        const completedStages = report.stages.filter(s => s.status === 'completed').length;
        const partialStages = report.stages.filter(s => s.status === 'partial').length;
        const totalStages = report.stages.length;
        report.overallQuality = Math.round(((completedStages * 100) + (partialStages * 70)) / totalStages);
        // Generate recommendations
        this.generateRecommendations(report);
        console.log(`✅ Pipeline completed: ${sessionId} - Quality: ${report.overallQuality}%`);
        console.log(`⏱️  Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
        console.log(`📚 Sources used: ${report.sourcesUsed}`);
        return report;
    }
    /**
     * Generate recommendations based on pipeline results
     */
    generateRecommendations(report) {
        const failed = report.stages.filter(s => s.status === 'failed');
        const partial = report.stages.filter(s => s.status === 'partial');
        if (failed.length > 0) {
            report.recommendations.push(`${failed.length} stage(s) failed. Consider re-running with different API providers.`);
        }
        if (partial.length > 0) {
            report.recommendations.push(`${partial.length} stage(s) had partial success. Review warnings for details.`);
        }
        if (report.sourcesMissing.length > 0) {
            report.recommendations.push(`Missing sources: ${report.sourcesMissing.join(', ')}. Add API keys to improve coverage.`);
        }
        if (report.overallQuality < 85) {
            report.recommendations.push('Quality score below 85%. Consider enabling more data sources or re-running failed stages.');
        }
    }
    /**
     * Get current pipeline status
     */
    getReport(sessionId) {
        return this.reports.get(sessionId);
    }
    /**
     * Get all pipeline reports
     */
    getAllReports() {
        return Array.from(this.reports.values());
    }
    /**
     * Clean up old reports (call periodically)
     */
    cleanup(maxAgeHours = 24) {
        const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
        for (const [id, report] of this.reports.entries()) {
            if (report.startTime < cutoff) {
                this.reports.delete(id);
            }
        }
    }
    /**
     * Emit update to listeners (implement WebSocket/SSE here)
     */
    emitUpdate(sessionId, stage) {
        // This can be extended to emit WebSocket events
        // For now, just log
        const emoji = stage.status === 'completed' ? '✅' :
            stage.status === 'failed' ? '❌' :
                stage.status === 'partial' ? '⚠️' :
                    stage.status === 'in_progress' ? '🔄' : '⏳';
        console.log(`${emoji} [${sessionId.slice(0, 8)}] ${stage.name}: ${stage.description}`);
    }
    /**
     * Format report for display
     */
    formatReport(sessionId) {
        const report = this.reports.get(sessionId);
        if (!report)
            return 'Report not found';
        let output = `\n📊 Pipeline Report: ${sessionId}\n`;
        output += `${'='.repeat(60)}\n\n`;
        report.stages.forEach(stage => {
            const emoji = stage.status === 'completed' ? '✅' :
                stage.status === 'failed' ? '❌' :
                    stage.status === 'partial' ? '⚠️' :
                        stage.status === 'in_progress' ? '🔄' : '⏳';
            output += `${emoji} Stage ${stage.id}: ${stage.name}\n`;
            output += `   Status: ${stage.status} (${stage.progress}%)\n`;
            output += `   ${stage.description}\n`;
            if (stage.details?.itemsTotal) {
                output += `   Items: ${stage.details.itemsProcessed}/${stage.details.itemsTotal}`;
                if (stage.details.itemsFailed) {
                    output += ` (${stage.details.itemsFailed} failed)`;
                }
                output += '\n';
            }
            if (stage.details?.warnings && stage.details.warnings.length > 0) {
                output += `   Warnings: ${stage.details.warnings.join(', ')}\n`;
            }
            if (stage.error) {
                output += `   Error: ${stage.error}\n`;
            }
            output += '\n';
        });
        output += `\n📈 Overall Quality: ${report.overallQuality}/100\n`;
        output += `📚 Sources Used: ${report.sourcesUsed}\n`;
        if (report.sourcesMissing.length > 0) {
            output += `❌ Missing: ${report.sourcesMissing.join(', ')}\n`;
        }
        if (report.recommendations.length > 0) {
            output += `\n💡 Recommendations:\n`;
            report.recommendations.forEach(rec => {
                output += `   • ${rec}\n`;
            });
        }
        return output;
    }
}
// Export singleton instance
export const pipelineMonitor = new PipelineMonitor();
// Auto-cleanup every 6 hours
setInterval(() => pipelineMonitor.cleanup(), 6 * 60 * 60 * 1000);
