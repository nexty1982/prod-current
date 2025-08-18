import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { IconDatabase, IconEye, IconCheck, IconDroplet, IconHeart, IconCross } from '@tabler/icons-react';

import { Button } from "../../components/ui/button";
import { useProvisionStore } from '../../store/provision';
import { setModules } from '../../lib/api';
import { Modules } from '../../lib/types';

// Validation schema
const modulesSchema = z.object({
  modules: z.array(z.enum(['baptism_records', 'marriage_records', 'funeral_records']))
    .min(1, 'Please select at least one module')
});

type ModulesFormData = z.infer<typeof modulesSchema>;

interface ModuleCardProps {
  id: 'baptism_records' | 'marriage_records' | 'funeral_records';
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onToggle: (id: string) => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ id, title, description, icon, selected, onToggle }) => (
  <button
    onClick={() => onToggle(id)}
    className={`
      w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left
      ${selected 
        ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105' 
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      }
    `}
  >
    <div className="flex items-start space-x-4">
      <div className={`
        p-3 rounded-xl transition-colors duration-200
        ${selected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}
      `}>
        {icon}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`
            text-lg font-semibold transition-colors duration-200
            ${selected ? 'text-indigo-900' : 'text-gray-900'}
          `}>
            {title}
          </h3>
          
          <div className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
            ${selected 
              ? 'border-indigo-500 bg-indigo-500' 
              : 'border-gray-300'
            }
          `}>
            {selected && <IconCheck size={16} className="text-white" />}
          </div>
        </div>
        
        <p className={`
          text-sm transition-colors duration-200
          ${selected ? 'text-indigo-700' : 'text-gray-600'}
        `}>
          {description}
        </p>
      </div>
    </div>
  </button>
);

const availableModules = [
  {
    id: 'baptism_records' as const,
    title: 'Baptism Records',
    description: 'Track baptisms, godparents, sponsors, and related documentation',
    icon: <IconDroplet size={24} />
  },
  {
    id: 'marriage_records' as const,
    title: 'Marriage Records',
    description: 'Manage marriage ceremonies, couple information, and certificates',
    icon: <IconHeart size={24} />
  },
  {
    id: 'funeral_records' as const,
    title: 'Funeral Records',
    description: 'Record funeral services, memorial information, and burial details',
    icon: <IconCross size={24} />
  }
];

export const Step2Modules: React.FC = () => {
  const navigate = useNavigate();
  const { current, setModules: setModulesStore } = useProvisionStore();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Modules>([]);

  const {
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<ModulesFormData>({
    resolver: zodResolver(modulesSchema),
    mode: 'onChange'
  });

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => {
      if (prev.includes(moduleId as any)) {
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId as any];
      }
    });
  };

  const onSubmit = async (data: ModulesFormData) => {
    try {
      setLoading(true);
      
      // Set modules via API
      await setModules(current.id!, selectedModules);
      
      // Store in local state
      setModulesStore(selectedModules);
      
      // Navigate to next step
      navigate('/apps/wizard/church/step3');
      
    } catch (error) {
      console.error('Error setting modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const canContinue = selectedModules.length > 0;

  console.log('Step2Modules rendering, selectedModules:', selectedModules);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex">
        <div className="hidden lg:flex lg:flex-col lg:w-80 lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-grow bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 overflow-y-auto">
            <div className="px-6 py-8">
              <div className="flex items-center">
                <IconDatabase className="h-8 w-8 text-white mr-3" />
                <h1 className="text-xl font-bold text-white">OrthodoxMetrics</h1>
              </div>
              <p className="mt-2 text-indigo-100 text-sm">
                Church Management Setup
              </p>
            </div>
            
            <div className="px-6 pb-6 flex-1">
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-green-400 border-green-400 text-white">
                    <IconCheck className="w-5 h-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-indigo-200">Basic Info</p>
                    <p className="text-xs text-indigo-300">Church details</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white border-white text-indigo-600">
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-white">Modules</p>
                    <p className="text-xs text-indigo-100">Select features</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-indigo-300 text-indigo-200">
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-indigo-200">Accounts</p>
                    <p className="text-xs text-indigo-300">User setup</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-indigo-300 text-indigo-200">
                    <span className="text-sm font-semibold">4</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-indigo-200">Summary</p>
                    <p className="text-xs text-indigo-300">Review & submit</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between text-xs text-indigo-200 mb-2">
                  <span>Step 2 of 4</span>
                  <span>50% Complete</span>
                </div>
                <div className="w-full bg-indigo-500/30 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '50%' }} />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-indigo-500/20">
              <p className="text-xs text-indigo-200">
                Your information is secure and encrypted
              </p>
            </div>
          </div>
        </div>

        <div className="lg:ml-80 flex-1">
          <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="lg:hidden mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">Module Selection</h1>
                      <p className="text-sm text-gray-500">Step 2 of 4</p>
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '50%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 sm:px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Modules</h2>
                  <p className="mt-1 text-gray-600">
                    Select which record management modules your church needs
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8">
                  <div className="space-y-4 mb-8">
                    {availableModules.map((module) => (
                      <ModuleCard
                        key={module.id}
                        {...module}
                        selected={selectedModules.includes(module.id)}
                        onToggle={toggleModule}
                      />
                    ))}
                  </div>

                  {errors.modules && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-600 text-sm">{errors.modules.message}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate('/apps/wizard/church/step1')}
                    >
                      Back
                    </Button>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="ghost"
                        startIcon={() => <IconEye className="w-4 h-4" />}
                        onClick={() => setShowPreview(true)}
                        disabled={selectedModules.length === 0}
                      >
                        Preview Structure
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        disabled={!canContinue || loading}
                        className="px-8"
                      >
                        Continue to Accounts
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Database Structure Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-indigo-200 hover:text-white transition-colors"
                >
                  <IconCross size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {selectedModules.map((moduleId) => {
                  const module = availableModules.find(m => m.id === moduleId);
                  return module ? (
                    <div key={moduleId} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mr-3">
                          {module.icon}
                        </div>
                        <h4 className="font-semibold text-gray-900">{module.title}</h4>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <IconDatabase size={16} className="text-gray-400" />
                          <span>Main table: {moduleId}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <IconDatabase size={16} className="text-gray-400" />
                          <span>Related tables: {moduleId}_attachments, {moduleId}_notes</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <IconDatabase size={16} className="text-gray-400" />
                          <span>Indexes: name, date, location</span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })}
                
                {selectedModules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <IconDatabase size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Select modules to see their database structure</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step2Modules;