import React, { useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Edit3,
  Eye,
  GripVertical,
  Image,
  Link2,
  Plus,
  Save,
  Trash2,
  X,
  CheckCircle2,
  Circle,
  PlayCircle,
  Settings,
  Layers,
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  imageUrl?: string;
  videoUrl?: string;
  order: number;
  isActive: boolean;
  ctaText?: string;
  ctaLink?: string;
}

const mockTutorialSteps: TutorialStep[] = [
  {
    id: '1',
    title: 'Welcome to Orthodox Metrics',
    description: 'Get started with your parish management dashboard. This tutorial will guide you through the key features.',
    targetElement: '#dashboard-header',
    imageUrl: '/images/onboarding/welcome.png',
    order: 1,
    isActive: true,
    ctaText: 'Get Started',
    ctaLink: '/dashboard',
  },
  {
    id: '2',
    title: 'Navigate the Sidebar',
    description: 'Use the sidebar to access different modules like Records, Calendar, Reports, and Settings.',
    targetElement: '#main-sidebar',
    order: 2,
    isActive: true,
    ctaText: 'Explore Menu',
  },
  {
    id: '3',
    title: 'Manage Parish Records',
    description: 'Add, edit, and organize baptism records, membership data, and sacramental certificates.',
    targetElement: '#records-module',
    imageUrl: '/images/onboarding/records.png',
    order: 3,
    isActive: true,
    ctaText: 'View Records',
    ctaLink: '/records',
  },
  {
    id: '4',
    title: 'Calendar & Events',
    description: 'Schedule liturgical events, feast days, and parish activities with the integrated calendar.',
    targetElement: '#calendar-widget',
    order: 4,
    isActive: false,
    ctaText: 'Open Calendar',
    ctaLink: '/calendar',
  },
  {
    id: '5',
    title: 'Generate Reports',
    description: 'Create detailed reports for diocese submissions, annual reviews, and statistical analysis.',
    targetElement: '#reports-section',
    order: 5,
    isActive: true,
    ctaText: 'Create Report',
    ctaLink: '/reports',
  },
];

const TutorialManager: React.FC = () => {
  const [steps, setSteps] = useState<TutorialStep[]>(mockTutorialSteps);
  const [selectedStep, setSelectedStep] = useState<TutorialStep | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewStep, setPreviewStep] = useState<TutorialStep>(mockTutorialSteps[0]);

  const handleEditStep = (step: TutorialStep) => {
    setSelectedStep({ ...step });
    setIsDrawerOpen(true);
  };

  const handleSaveStep = () => {
    if (!selectedStep) return;
    setSteps((prev) =>
      prev.map((s) => (s.id === selectedStep.id ? selectedStep : s))
    );
    setPreviewStep(selectedStep);
    setIsDrawerOpen(false);
    setSelectedStep(null);
  };

  const handleDeleteStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleAddStep = () => {
    const newStep: TutorialStep = {
      id: `${Date.now()}`,
      title: 'New Tutorial Step',
      description: 'Enter a description for this onboarding step.',
      order: steps.length + 1,
      isActive: true,
    };
    setSteps((prev) => [...prev, newStep]);
    handleEditStep(newStep);
  };

  const handlePreview = (step: TutorialStep) => {
    setPreviewStep(step);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg shadow-purple-200">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Tutorial Editor</h1>
              <p className="text-slate-500 text-sm">Manage onboarding steps for new users</p>
            </div>
          </div>
          <button
            onClick={handleAddStep}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Steps List */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-500" />
                  <h2 className="font-semibold text-slate-700">Onboarding Steps</h2>
                </div>
                <span className="text-xs font-medium px-3 py-1 bg-purple-100 text-purple-600 rounded-full">
                  {steps.filter((s) => s.isActive).length} Active
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`group px-6 py-4 flex items-center gap-4 hover:bg-purple-50/50 transition-colors duration-150 ${
                      previewStep.id === step.id ? 'bg-purple-50/70 border-l-4 border-purple-500' : ''
                    }`}
                  >
                    <div className="cursor-grab text-slate-300 hover:text-slate-400">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 text-purple-600 font-semibold text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800 truncate">{step.title}</h3>
                        {step.isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{step.description}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePreview(step)}
                        className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditStep(step)}
                        className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(step.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          step.isActive
                            ? 'text-emerald-500 hover:bg-emerald-100'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={step.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                ))}
              </div>

              {steps.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-slate-500">No tutorial steps yet. Add your first step!</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="xl:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  <h2 className="font-semibold text-slate-700">Live Preview</h2>
                </div>

                {/* Preview Card with Purple Gradient */}
                <div className="p-6">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 shadow-2xl shadow-purple-300/50">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative p-6">
                      {/* Step Indicator */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1">
                          {steps.slice(0, 5).map((s, i) => (
                            <div
                              key={s.id}
                              className={`w-2 h-2 rounded-full transition-all ${
                                s.id === previewStep.id
                                  ? 'w-6 bg-white'
                                  : 'bg-white/40'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-white/70 text-xs ml-auto">
                          Step {steps.findIndex((s) => s.id === previewStep.id) + 1} of {steps.length}
                        </span>
                      </div>

                      {/* Image Placeholder */}
                      {previewStep.imageUrl && (
                        <div className="mb-4 bg-white/10 rounded-xl h-32 flex items-center justify-center">
                          <Image className="w-10 h-10 text-white/50" />
                        </div>
                      )}

                      {/* Content */}
                      <h3 className="text-xl font-bold text-white mb-2">{previewStep.title}</h3>
                      <p className="text-white/80 text-sm leading-relaxed mb-6">
                        {previewStep.description}
                      </p>

                      {/* Target Element Badge */}
                      {previewStep.targetElement && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-white/70 text-xs mb-4">
                          <Settings className="w-3 h-3" />
                          Target: {previewStep.targetElement}
                        </div>
                      )}

                      {/* CTA Button */}
                      {previewStep.ctaText && (
                        <button className="w-full py-3 bg-white text-purple-600 font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg">
                          {previewStep.ctaText}
                        </button>
                      )}

                      {/* Navigation Buttons */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                        <button className="text-white/70 text-sm hover:text-white transition-colors">
                          Skip Tutorial
                        </button>
                        <button className="flex items-center gap-1 text-white text-sm font-medium hover:gap-2 transition-all">
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preview Info */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 text-center">
                      This preview shows how the tutorial step will appear to users during onboarding.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Drawer/Sidebar */}
      {isDrawerOpen && selectedStep && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Edit3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Edit Step</h2>
                  <p className="text-xs text-slate-500">Step {selectedStep.order}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Step Title
                </label>
                <input
                  type="text"
                  value={selectedStep.title}
                  onChange={(e) =>
                    setSelectedStep({ ...selectedStep, title: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter step title..."
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={selectedStep.description}
                  onChange={(e) =>
                    setSelectedStep({ ...selectedStep, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Describe what this step teaches..."
                />
              </div>

              {/* Target Element */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" />
                    Target Element Selector
                  </div>
                </label>
                <input
                  type="text"
                  value={selectedStep.targetElement || ''}
                  onChange={(e) =>
                    setSelectedStep({ ...selectedStep, targetElement: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-sm"
                  placeholder="#element-id or .class-name"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-slate-400" />
                    Image URL (Optional)
                  </div>
                </label>
                <input
                  type="text"
                  value={selectedStep.imageUrl || ''}
                  onChange={(e) =>
                    setSelectedStep({ ...selectedStep, imageUrl: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="/images/onboarding/step.png"
                />
              </div>

              {/* CTA Section */}
              <div className="p-4 bg-purple-50 rounded-xl space-y-4">
                <h3 className="font-medium text-purple-800 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Call to Action
                </h3>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={selectedStep.ctaText || ''}
                    onChange={(e) =>
                      setSelectedStep({ ...selectedStep, ctaText: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                    placeholder="Continue"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Button Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={selectedStep.ctaLink || ''}
                    onChange={(e) =>
                      setSelectedStep({ ...selectedStep, ctaLink: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                    placeholder="/dashboard"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-700">Active Status</p>
                  <p className="text-xs text-slate-500">Show this step in the tutorial flow</p>
                </div>
                <button
                  onClick={() =>
                    setSelectedStep({ ...selectedStep, isActive: !selectedStep.isActive })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    selectedStep.isActive ? 'bg-purple-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      selectedStep.isActive ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center gap-3">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1 px-4 py-3 text-slate-600 font-medium bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStep}
                className="flex-1 px-4 py-3 text-white font-medium bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TutorialManager;

