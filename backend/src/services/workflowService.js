/**
 * Workflow Service
 * Manages specialized workflows for educators and creative professionals
 */

const { WorkflowState, EducationalProject, CreativeWork, SkillMatrix } = require('../models');
const { Op } = require('sequelize');

class WorkflowService {
  
  /**
   * Project Showcase Workflow
   * Multi-stage process for educational project documentation
   */
  static async initiateProjectShowcaseWorkflow(projectId, userId) {
    const workflowSteps = [
      {
        step: 'requirements_gathering',
        description: 'Collect project requirements and learning objectives',
        estimatedHours: 4,
        checklist: [
          { id: 'learning_objectives', text: 'Define learning objectives', completed: false },
          { id: 'target_audience', text: 'Identify target audience', completed: false },
          { id: 'context_analysis', text: 'Analyze project context', completed: false },
          { id: 'success_metrics', text: 'Define success metrics', completed: false },
        ]
      },
      {
        step: 'technology_documentation',
        description: 'Document technology stack and implementation decisions',
        estimatedHours: 6,
        checklist: [
          { id: 'tech_stack', text: 'Document technology choices', completed: false },
          { id: 'architecture_overview', text: 'Create architecture overview', completed: false },
          { id: 'integration_points', text: 'Document integrations', completed: false },
          { id: 'development_timeline', text: 'Create development timeline', completed: false },
        ]
      },
      {
        step: 'outcome_measurement',
        description: 'Collect and analyze project outcomes',
        estimatedHours: 8,
        checklist: [
          { id: 'quantitative_data', text: 'Collect quantitative metrics', completed: false },
          { id: 'qualitative_feedback', text: 'Gather qualitative feedback', completed: false },
          { id: 'impact_analysis', text: 'Analyze long-term impact', completed: false },
          { id: 'lessons_learned', text: 'Document lessons learned', completed: false },
        ]
      },
      {
        step: 'peer_review',
        description: 'Professional peer review and feedback',
        estimatedHours: 3,
        checklist: [
          { id: 'peer_assignment', text: 'Assign peer reviewers', completed: false },
          { id: 'review_completion', text: 'Complete peer review', completed: false },
          { id: 'feedback_integration', text: 'Integrate feedback', completed: false },
        ]
      },
      {
        step: 'portfolio_preparation',
        description: 'Prepare for portfolio publication',
        estimatedHours: 4,
        checklist: [
          { id: 'content_editing', text: 'Edit and polish content', completed: false },
          { id: 'visual_assets', text: 'Prepare visual assets', completed: false },
          { id: 'seo_optimization', text: 'Optimize for search', completed: false },
          { id: 'accessibility_check', text: 'Accessibility review', completed: false },
        ]
      },
      {
        step: 'multilingual_preparation',
        description: 'Prepare Spanish translation and cultural adaptation',
        estimatedHours: 6,
        checklist: [
          { id: 'translation', text: 'Complete Spanish translation', completed: false },
          { id: 'cultural_adaptation', text: 'Adapt for Colombian context', completed: false },
          { id: 'linguistic_review', text: 'Native speaker review', completed: false },
        ]
      }
    ];

    const workflows = [];
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const workflow = await WorkflowState.create({
        content_id: projectId,
        content_type: 'educational_project',
        workflow_type: 'educational_review',
        current_step: step.step,
        step_order: i + 1,
        total_steps: workflowSteps.length,
        status: i === 0 ? 'in_progress' : 'not_started',
        assigned_to: userId,
        estimated_hours: step.estimatedHours,
        checklist: step.checklist,
        next_step: i < workflowSteps.length - 1 ? workflowSteps[i + 1].step : null,
        workflow_data: {
          description: step.description,
          is_educational_showcase: true,
        }
      });
      workflows.push(workflow);
    }

    return workflows;
  }

  /**
   * Teaching Materials Workflow
   * Systematic review and approval process for educational content
   */
  static async initiateTeachingMaterialsWorkflow(contentId, contentType, userId, options = {}) {
    const { educationalLevel, subjectArea, requiresPeerReview = true } = options;
    
    const workflowSteps = [
      {
        step: 'content_creation',
        description: 'Initial content creation and structuring',
        estimatedHours: 8,
        checklist: [
          { id: 'learning_objectives', text: 'Define clear learning objectives', completed: false },
          { id: 'content_structure', text: 'Structure content logically', completed: false },
          { id: 'assessment_alignment', text: 'Align with assessment criteria', completed: false },
          { id: 'differentiation', text: 'Include differentiation strategies', completed: false },
        ]
      },
      {
        step: 'pedagogical_validation',
        description: 'Review pedagogical soundness and best practices',
        estimatedHours: 4,
        checklist: [
          { id: 'pedagogical_approach', text: 'Validate pedagogical approach', completed: false },
          { id: 'age_appropriateness', text: 'Check age appropriateness', completed: false },
          { id: 'engagement_strategies', text: 'Review engagement strategies', completed: false },
          { id: 'scaffolding', text: 'Verify scaffolding structure', completed: false },
        ]
      },
      {
        step: 'accessibility_review',
        description: 'Ensure content is accessible to all learners',
        estimatedHours: 3,
        checklist: [
          { id: 'visual_accessibility', text: 'Check visual accessibility', completed: false },
          { id: 'cognitive_accessibility', text: 'Review cognitive accessibility', completed: false },
          { id: 'language_accessibility', text: 'Assess language complexity', completed: false },
          { id: 'tech_accessibility', text: 'Verify technology accessibility', completed: false },
        ]
      }
    ];

    if (requiresPeerReview) {
      workflowSteps.push({
        step: 'peer_workshop',
        description: 'Collaborative peer review and feedback',
        estimatedHours: 2,
        checklist: [
          { id: 'peer_assignment', text: 'Assign peer reviewers', completed: false },
          { id: 'workshop_session', text: 'Conduct peer workshop', completed: false },
          { id: 'feedback_documentation', text: 'Document feedback', completed: false },
          { id: 'revision_plan', text: 'Create revision plan', completed: false },
        ]
      });
    }

    workflowSteps.push({
      step: 'student_testing',
      description: 'Test with actual students for effectiveness',
      estimatedHours: 6,
      checklist: [
        { id: 'pilot_group', text: 'Select pilot student group', completed: false },
        { id: 'testing_session', text: 'Conduct testing session', completed: false },
        { id: 'feedback_analysis', text: 'Analyze student feedback', completed: false },
        { id: 'effectiveness_metrics', text: 'Measure effectiveness', completed: false },
      ]
    });

    const workflows = [];
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const workflow = await WorkflowState.create({
        content_id: contentId,
        content_type: contentType,
        workflow_type: 'educational_review',
        current_step: step.step,
        step_order: i + 1,
        total_steps: workflowSteps.length,
        status: i === 0 ? 'in_progress' : 'not_started',
        assigned_to: userId,
        estimated_hours: step.estimatedHours,
        checklist: step.checklist,
        next_step: i < workflowSteps.length - 1 ? workflowSteps[i + 1].step : null,
        workflow_data: {
          description: step.description,
          educational_level: educationalLevel,
          subject_area: subjectArea,
        }
      });
      workflows.push(workflow);
    }

    return workflows;
  }

  /**
   * Creative Writing Workflow
   * Editorial process for poetry and prose
   */
  static async initiateCreativeWritingWorkflow(workId, userId, options = {}) {
    const { requiresPeerWorkshop = true, targetPublication = false } = options;
    
    const workflowSteps = [
      {
        step: 'initial_draft',
        description: 'Complete initial draft with basic structure',
        estimatedHours: 2,
        checklist: [
          { id: 'content_complete', text: 'Complete content draft', completed: false },
          { id: 'initial_formatting', text: 'Apply initial formatting', completed: false },
          { id: 'self_review', text: 'Complete self-review', completed: false },
        ]
      },
      {
        step: 'creative_editing',
        description: 'Focus on creative elements, voice, and style',
        estimatedHours: 3,
        checklist: [
          { id: 'voice_consistency', text: 'Ensure voice consistency', completed: false },
          { id: 'style_refinement', text: 'Refine style and tone', completed: false },
          { id: 'imagery_enhancement', text: 'Enhance imagery and metaphors', completed: false },
          { id: 'rhythm_flow', text: 'Check rhythm and flow', completed: false },
        ]
      }
    ];

    if (requiresPeerWorkshop) {
      workflowSteps.push({
        step: 'peer_workshop',
        description: 'Peer workshop for collaborative feedback',
        estimatedHours: 2,
        checklist: [
          { id: 'workshop_preparation', text: 'Prepare for workshop', completed: false },
          { id: 'peer_feedback', text: 'Receive peer feedback', completed: false },
          { id: 'feedback_evaluation', text: 'Evaluate feedback', completed: false },
          { id: 'revision_decisions', text: 'Make revision decisions', completed: false },
        ]
      });
    }

    workflowSteps.push({
      step: 'revision_integration',
      description: 'Integrate feedback and complete revisions',
      estimatedHours: 2,
      checklist: [
        { id: 'content_revisions', text: 'Apply content revisions', completed: false },
        { id: 'structural_changes', text: 'Make structural changes', completed: false },
        { id: 'line_editing', text: 'Complete line editing', completed: false },
        { id: 'final_proofing', text: 'Final proofreading', completed: false },
      ]
    });

    if (targetPublication) {
      workflowSteps.push({
        step: 'publication_preparation',
        description: 'Prepare for publication submission',
        estimatedHours: 1,
        checklist: [
          { id: 'format_guidelines', text: 'Follow publication guidelines', completed: false },
          { id: 'submission_package', text: 'Prepare submission package', completed: false },
          { id: 'cover_letter', text: 'Write cover letter', completed: false },
        ]
      });
    }

    const workflows = [];
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const workflow = await WorkflowState.create({
        content_id: workId,
        content_type: 'creative_work',
        workflow_type: 'creative_editing',
        current_step: step.step,
        step_order: i + 1,
        total_steps: workflowSteps.length,
        status: i === 0 ? 'in_progress' : 'not_started',
        assigned_to: userId,
        estimated_hours: step.estimatedHours,
        checklist: step.checklist,
        next_step: i < workflowSteps.length - 1 ? workflowSteps[i + 1].step : null,
        workflow_data: {
          description: step.description,
          target_publication: targetPublication,
          requires_workshop: requiresPeerWorkshop,
        }
      });
      workflows.push(workflow);
    }

    return workflows;
  }

  /**
   * Multilingual Synchronization Workflow
   * Ensures content consistency across languages
   */
  static async initiateMultilingualSyncWorkflow(contentId, contentType, userId, options = {}) {
    const { sourceLanguage = 'en', targetLanguage = 'es', requiresCulturalAdaptation = true } = options;
    
    const workflowSteps = [
      {
        step: 'translation_planning',
        description: 'Plan translation approach and cultural considerations',
        estimatedHours: 2,
        checklist: [
          { id: 'content_analysis', text: 'Analyze source content', completed: false },
          { id: 'cultural_considerations', text: 'Identify cultural adaptation needs', completed: false },
          { id: 'terminology_glossary', text: 'Create terminology glossary', completed: false },
          { id: 'translation_style', text: 'Define translation style guide', completed: false },
        ]
      },
      {
        step: 'content_translation',
        description: 'Complete professional translation',
        estimatedHours: 6,
        checklist: [
          { id: 'initial_translation', text: 'Complete initial translation', completed: false },
          { id: 'terminology_consistency', text: 'Ensure terminology consistency', completed: false },
          { id: 'formatting_preservation', text: 'Preserve original formatting', completed: false },
        ]
      }
    ];

    if (requiresCulturalAdaptation) {
      workflowSteps.push({
        step: 'cultural_adaptation',
        description: 'Adapt content for Colombian/Latin American context',
        estimatedHours: 4,
        checklist: [
          { id: 'cultural_references', text: 'Adapt cultural references', completed: false },
          { id: 'local_examples', text: 'Include local examples', completed: false },
          { id: 'regional_preferences', text: 'Consider regional preferences', completed: false },
          { id: 'market_appropriateness', text: 'Ensure market appropriateness', completed: false },
        ]
      });
    }

    workflowSteps.push({
      step: 'linguistic_quality_assurance',
      description: 'Native speaker review and quality assurance',
      estimatedHours: 3,
      checklist: [
        { id: 'native_speaker_review', text: 'Native speaker review', completed: false },
        { id: 'grammar_check', text: 'Grammar and syntax check', completed: false },
        { id: 'readability_assessment', text: 'Readability assessment', completed: false },
        { id: 'final_proofreading', text: 'Final proofreading', completed: false },
      ]
    });

    workflowSteps.push({
      step: 'multilingual_sync',
      description: 'Synchronize and link multilingual versions',
      estimatedHours: 1,
      checklist: [
        { id: 'version_linking', text: 'Link multilingual versions', completed: false },
        { id: 'metadata_sync', text: 'Synchronize metadata', completed: false },
        { id: 'seo_optimization', text: 'Optimize for Spanish SEO', completed: false },
        { id: 'cross_reference', text: 'Validate cross-references', completed: false },
      ]
    });

    const workflows = [];
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const workflow = await WorkflowState.create({
        content_id: contentId,
        content_type: contentType,
        workflow_type: 'multilingual_sync',
        current_step: step.step,
        step_order: i + 1,
        total_steps: workflowSteps.length,
        status: i === 0 ? 'in_progress' : 'not_started',
        assigned_to: userId,
        estimated_hours: step.estimatedHours,
        checklist: step.checklist,
        next_step: i < workflowSteps.length - 1 ? workflowSteps[i + 1].step : null,
        workflow_data: {
          description: step.description,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          cultural_adaptation: requiresCulturalAdaptation,
        }
      });
      workflows.push(workflow);
    }

    return workflows;
  }

  /**
   * Testimonial Collection Workflow
   * Systematic approach to collecting and managing recommendations
   */
  static async initiateTestimonialWorkflow(userId, testimonialData) {
    const workflowSteps = [
      {
        step: 'relationship_mapping',
        description: 'Map relationships and identify potential testimonial sources',
        estimatedHours: 2,
        checklist: [
          { id: 'contact_identification', text: 'Identify potential contacts', completed: false },
          { id: 'relationship_context', text: 'Document relationship contexts', completed: false },
          { id: 'priority_ranking', text: 'Rank contacts by priority', completed: false },
          { id: 'contact_verification', text: 'Verify contact information', completed: false },
        ]
      },
      {
        step: 'personalized_outreach',
        description: 'Create personalized requests for testimonials',
        estimatedHours: 3,
        checklist: [
          { id: 'personalized_messages', text: 'Write personalized messages', completed: false },
          { id: 'context_provision', text: 'Provide relevant context', completed: false },
          { id: 'specific_examples', text: 'Include specific examples', completed: false },
          { id: 'clear_guidelines', text: 'Provide clear guidelines', completed: false },
        ]
      },
      {
        step: 'testimonial_review',
        description: 'Review and validate received testimonials',
        estimatedHours: 2,
        checklist: [
          { id: 'authenticity_verification', text: 'Verify authenticity', completed: false },
          { id: 'content_review', text: 'Review content quality', completed: false },
          { id: 'permission_confirmation', text: 'Confirm usage permissions', completed: false },
          { id: 'contact_validation', text: 'Validate contact details', completed: false },
        ]
      },
      {
        step: 'testimonial_integration',
        description: 'Integrate testimonials into portfolio',
        estimatedHours: 2,
        checklist: [
          { id: 'categorization', text: 'Categorize testimonials', completed: false },
          { id: 'context_documentation', text: 'Document context and relationship', completed: false },
          { id: 'visual_integration', text: 'Create visual integration', completed: false },
          { id: 'cross_referencing', text: 'Cross-reference with projects', completed: false },
        ]
      }
    ];

    const workflows = [];
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const workflow = await WorkflowState.create({
        content_id: testimonialData.id || require('uuid').v4(),
        content_type: 'testimonial',
        workflow_type: 'content_approval',
        current_step: step.step,
        step_order: i + 1,
        total_steps: workflowSteps.length,
        status: i === 0 ? 'in_progress' : 'not_started',
        assigned_to: userId,
        estimated_hours: step.estimatedHours,
        checklist: step.checklist,
        next_step: i < workflowSteps.length - 1 ? workflowSteps[i + 1].step : null,
        workflow_data: {
          description: step.description,
          testimonial_type: testimonialData.type,
          relationship_context: testimonialData.relationship,
        }
      });
      workflows.push(workflow);
    }

    return workflows;
  }

  /**
   * Get workflow dashboard for user
   */
  static async getWorkflowDashboard(userId) {
    const [activeWorkflows, overdueWorkflows, completedToday] = await Promise.all([
      WorkflowState.getActiveWorkflows(userId),
      WorkflowState.getOverdueWorkflows(),
      WorkflowState.findAll({
        where: {
          assigned_to: userId,
          status: 'completed',
          completed_at: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const stats = await WorkflowState.getWorkflowStats(userId);

    return {
      active_workflows: activeWorkflows,
      overdue_workflows: overdueWorkflows.filter(w => w.assigned_to === userId),
      completed_today: completedToday,
      stats,
      workflow_types: {
        educational_projects: activeWorkflows.filter(w => w.content_type === 'educational_project').length,
        creative_works: activeWorkflows.filter(w => w.content_type === 'creative_work').length,
        translations: activeWorkflows.filter(w => w.workflow_type === 'multilingual_sync').length,
        testimonials: activeWorkflows.filter(w => w.content_type === 'testimonial').length,
      }
    };
  }

  /**
   * Auto-advance workflow based on completion
   */
  static async processWorkflowAdvancement(workflowId) {
    const workflow = await WorkflowState.findByPk(workflowId);
    if (!workflow || workflow.status !== 'completed') return null;

    // Check if all checklist items are completed
    const checklist = workflow.checklist || [];
    const allItemsCompleted = checklist.every(item => item.completed);
    
    if (!allItemsCompleted) {
      throw new Error('Cannot advance workflow - checklist items incomplete');
    }

    // Auto-advance to next step
    if (workflow.next_step) {
      const nextWorkflow = await workflow.advanceToNextStep();
      
      // Auto-assign based on workflow type
      await this.autoAssignWorkflow(nextWorkflow);
      
      return nextWorkflow;
    }

    return null;
  }

  /**
   * Auto-assign workflow based on type and user preferences
   */
  static async autoAssignWorkflow(workflow) {
    // This could be enhanced with user preferences and availability
    const assignmentRules = {
      'translation': 'native_spanish_speaker',
      'peer_review': 'subject_matter_expert',
      'cultural_adaptation': 'cultural_expert',
      'accessibility_review': 'accessibility_specialist',
    };

    // For now, keep assigned to original user unless specific expertise needed
    const rule = assignmentRules[workflow.current_step];
    if (!rule) return;

    // Could integrate with team management system here
    // For Brandon's solo operation, workflows stay assigned to him
  }

  /**
   * Generate workflow analytics
   */
  static async getWorkflowAnalytics(userId, dateRange = 30) {
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    
    const workflows = await WorkflowState.findAll({
      where: {
        assigned_to: userId,
        created_at: { [Op.gte]: startDate }
      }
    });

    const analytics = {
      total_workflows: workflows.length,
      completed: workflows.filter(w => w.status === 'completed').length,
      average_completion_time: 0,
      workflow_type_breakdown: {},
      productivity_trend: [],
      bottlenecks: [],
    };

    // Calculate average completion time
    const completedWorkflows = workflows.filter(w => w.status === 'completed' && w.started_at && w.completed_at);
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((acc, w) => {
        const duration = new Date(w.completed_at) - new Date(w.started_at);
        return acc + duration;
      }, 0);
      analytics.average_completion_time = totalTime / completedWorkflows.length / (1000 * 60 * 60); // hours
    }

    // Workflow type breakdown
    workflows.forEach(w => {
      const type = w.workflow_type;
      analytics.workflow_type_breakdown[type] = (analytics.workflow_type_breakdown[type] || 0) + 1;
    });

    return analytics;
  }
}

module.exports = WorkflowService;