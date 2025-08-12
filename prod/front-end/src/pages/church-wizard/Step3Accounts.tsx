import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { IconUser, IconLock, IconMail, IconEye, IconEyeOff, IconShield, IconCheck } from '@tabler/icons-react';

import { Button } from "../../components/ui/button";
import { Input } from '../../components/ui/input';
import { useProvisionStore } from '../../store/provision';
import { setAccounts } from '../../lib/api';
import { Accounts } from '../../lib/types';

// Validation schema
const accountsSchema = z.object({
  defaultEmail: z.string().email('Please enter a valid email address'),
  defaultPassword: z.string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character'),
  extraEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  extraPassword: z.string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character')
    .optional()
    .or(z.literal(''))
}).refine((data) => {
  if (data.extraEmail && !data.extraPassword) {
    return false;
  }
  if (data.extraPassword && !data.extraEmail) {
    return false;
  }
  return true;
}, {
  message: "Both extra email and password are required if adding a second user",
  path: ["extraEmail"]
});

type AccountsFormData = z.infer<typeof accountsSchema>;

interface PasswordStrengthProps {
  password: string;
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 10) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[@$!%*?&]/.test(pass)) score++;
    
    if (score <= 2) return { level: 'Weak', color: 'text-red-600', bg: 'bg-red-100' };
    if (score <= 3) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score <= 4) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { level: 'Strong', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const strength = getStrength(password);
  const percentage = (password.length / 10) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Password Strength</span>
        <span className={`text-sm font-medium ${strength.color}`}>{strength.level}</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            strength.level === 'Weak' ? 'bg-red-500' :
            strength.level === 'Fair' ? 'bg-yellow-500' :
            strength.level === 'Good' ? 'bg-blue-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <IconCheck size={14} className={password.length >= 10 ? 'text-green-500' : 'text-gray-300'} />
          <span>At least 10 characters</span>
        </div>
        <div className="flex items-center space-x-2">
          <IconCheck size={14} className={/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-300'} />
          <span>Lowercase letter</span>
        </div>
        <div className="flex items-center space-x-2">
          <IconCheck size={14} className={/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-300'} />
          <span>Uppercase letter</span>
        </div>
        <div className="flex items-center space-x-2">
          <IconCheck size={14} className={/\d/.test(password) ? 'text-green-500' : 'text-gray-300'} />
          <span>Number</span>
        </div>
        <div className="flex items-center space-x-2">
          <IconCheck size={14} className={/[@$!%*?&]/.test(password) ? 'text-green-500' : 'text-gray-300'} />
          <span>Special character</span>
        </div>
      </div>
    </div>
  );
};

export const Step3Accounts: React.FC = () => {
  const navigate = useNavigate();
  const { current, setAccounts: setAccountsStore } = useProvisionStore();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ default: false, extra: false });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<AccountsFormData>({
    resolver: zodResolver(accountsSchema),
    mode: 'onChange',
    defaultValues: {
      defaultEmail: current.basic?.email || ''
    }
  });

  const watchedPasswords = watch(['defaultPassword', 'extraPassword']);
  const extraEmail = watch('extraEmail');

  const onSubmit = async (data: AccountsFormData) => {
    try {
      setLoading(true);
      
      // Set accounts via API
      await setAccounts(current.id!, data);
      
      // Store in local state
      setAccountsStore(data);
      
      // Navigate to summary
      navigate('/apps/wizard/church/summary');
      
    } catch (error) {
      console.error('Error setting accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'default' | 'extra') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Admin Accounts
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Set up your primary admin account and optionally add a second administrator. 
            These accounts will be activated once your church is approved.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
            <h2 className="text-2xl font-bold text-white mb-2">Step 3: Account Creation</h2>
            <p className="text-indigo-100">
              Set up secure admin credentials for your church
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
            {/* Primary Admin Account */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <IconShield className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Primary Administrator</h3>
                  <p className="text-sm text-gray-600">This will be your main admin account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="admin@church.org"
                  startIcon={<IconMail className="h-5 w-5" />}
                  error={errors.defaultEmail?.message}
                  {...register('defaultEmail')}
                  required
                />
                
                <div className="space-y-2">
                  <Input
                    label="Password *"
                    type={showPasswords.default ? 'text' : 'password'}
                    placeholder="Enter secure password"
                    startIcon={<IconLock className="h-5 w-5" />}
                    endIcon={
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('default')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.default ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                      </button>
                    }
                    error={errors.defaultPassword?.message}
                    {...register('defaultPassword')}
                    required
                  />
                  
                  {watchedPasswords[0] && (
                    <PasswordStrength password={watchedPasswords[0]} />
                  )}
                </div>
              </div>
            </div>

            {/* Secondary Admin Account (Optional) */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <IconUser className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Secondary Administrator (Optional)</h3>
                  <p className="text-sm text-gray-600">Add another admin for your church</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="admin2@church.org"
                  startIcon={<IconMail className="h-5 w-5" />}
                  error={errors.extraEmail?.message}
                  {...register('extraEmail')}
                />
                
                <div className="space-y-2">
                  <Input
                    label="Password"
                    type={showPasswords.extra ? 'text' : 'password'}
                    placeholder="Enter secure password"
                    startIcon={<IconLock className="h-5 w-5" />}
                    endIcon={
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('extra')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.extra ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                      </button>
                    }
                    error={errors.extraPassword?.message}
                    {...register('extraPassword')}
                    disabled={!extraEmail}
                  />
                  
                  {watchedPasswords[1] && extraEmail && (
                    <PasswordStrength password={watchedPasswords[1]} />
                  )}
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <IconShield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Security Information</h4>
                  <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    <li>• Passwords are encrypted and never stored in plain text</li>
                    <li>• Accounts remain pending until church approval</li>
                    <li>• You can reset passwords after activation</li>
                    <li>• All login attempts are logged for security</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/apps/wizard/church/modules')}
              >
                Back
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!isValid || loading}
                className="w-full sm:w-auto px-8"
              >
                Complete Setup
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">
            Your accounts will be created and activated once your church setup is approved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step3Accounts;
