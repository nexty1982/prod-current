import React, { useState } from 'react';
import { 
  Upload, 
  Scan, 
  CheckCircle, 
  FileText, 
  Calendar, 
  Globe, 
  Shield,
  ArrowRight,
  BookOpen,
  Users,
  Clock,
  Download,
  Search,
  Star
} from 'lucide-react';

const OrthodoxMetrics = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: "1",
      title: "Upload Your Church Records",
      description: "Start by uploading scanned images of your existing handwritten documents — baptisms, marriages, funerals, and more. You can drag-and-drop them into our secure interface or schedule a bulk transfer with our onboarding team.",
      icon: Upload,
      color: "blue"
    },
    {
      number: "2", 
      title: "OCR Technology Reads and Converts the Text",
      description: "Our advanced optical character recognition (OCR) system is trained to handle handwritten Orthodox records. It carefully analyzes each page, extracting names, dates, sacraments, clergy names, and locations — even across multiple languages.",
      icon: Scan,
      color: "purple"
    },
    {
      number: "3",
      title: "Review and Approve",
      description: "After OCR processing, you'll be able to review the results in a clean, structured layout. You can make quick edits or approve entries in batches. This gives you full control and peace of mind before records are committed.",
      icon: CheckCircle,
      color: "green"
    },
    {
      number: "4",
      title: "Generate Certificates and Reports",
      description: "Need an official Baptismal Certificate for a parishioner? You can generate one instantly. Our platform supports custom Orthodox designs for Baptismal Certificates, Marriage Records, Memorial Documentation, and exportable PDF or printed forms.",
      icon: FileText,
      color: "orange"
    },
    {
      number: "5",
      title: "Connect to the Liturgical Calendar",
      description: "All records integrate with an Orthodox liturgical calendar. Track feast days and saints commemorations, schedule services aligned with liturgical cycles, and see sacramental history by season, priest, or family.",
      icon: Calendar,
      color: "indigo"
    },
    {
      number: "6",
      title: "Work in Your Native Language",
      description: "Orthodox Metrics supports Greek (Ελληνικά), Russian (Русский), Romanian (Română), and English. All data is preserved in its authentic script, searchable, and printable.",
      icon: Globe,
      color: "teal"
    },
    {
      number: "7",
      title: "Access From Anywhere — Securely",
      description: "Manage your parish records from any modern browser. With military-grade encryption, your data is protected. Only authorized parish staff can access records, and everything is backed up automatically.",
      icon: Shield,
      color: "red"
    }
  ];

  const benefits = [
    { icon: Clock, text: "Saves hours of manual searching and paperwork" },
    { icon: BookOpen, text: "Preserves aging documents digitally for generations" },
    { icon: Star, text: "Supports your unique Orthodox traditions" },
    { icon: Users, text: "Easy onboarding with our guided support team" },
    { icon: Search, text: "Built specifically for Orthodox churches, not generic software" }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-500 border-blue-300 text-blue-100",
      purple: "bg-purple-500 border-purple-300 text-purple-100", 
      green: "bg-green-500 border-green-300 text-green-100",
      orange: "bg-orange-500 border-orange-300 text-orange-100",
      indigo: "bg-indigo-500 border-indigo-300 text-indigo-100",
      teal: "bg-teal-500 border-teal-300 text-teal-100",
      red: "bg-red-500 border-red-300 text-red-100"
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Orthodox Metrics</h1>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Welcome to Orthodox Metrics</h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              Orthodox Metrics is a digital platform designed specifically for Eastern Orthodox parishes. 
              We help clergy, administrators, and archivists transition from paper-based recordkeeping to a 
              secure, searchable, and fully digital system — without sacrificing tradition.
            </p>
            <p className="text-lg text-gray-600">
              Whether you're managing baptismal records from 1903 or preparing certificates for this week's wedding, 
              Orthodox Metrics simplifies the process and preserves every sacred detail.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works — Step-by-Step</h3>
          
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-start space-x-6 p-8 rounded-xl transition-all duration-300 cursor-pointer ${
                  activeStep === index 
                    ? 'bg-white shadow-lg border-l-4 border-blue-500' 
                    : 'bg-white/50 hover:bg-white hover:shadow-md'
                }`}
                onClick={() => setActiveStep(index)}
              >
                <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${getColorClasses(step.color)}`}>
                  <step.icon className="w-8 h-8" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl font-bold text-gray-900">{step.number}</span>
                    <h4 className="text-xl font-semibold text-gray-900">{step.title}</h4>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-lg">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-16 bg-white rounded-xl p-8 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Why Orthodox Parishes Choose Us</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <benefit.icon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <span className="text-gray-700">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Begin?</h3>
          <p className="text-xl mb-8 opacity-90">
            Start preserving your sacred history — one record at a time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button className="group px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center">
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Schedule a Free Consultation
            </button>
          </div>
          
          <div className="text-sm opacity-75">
            <p>Questions? We're here to help at <strong>support@orthodoxmetrics.com</strong></p>
            <p>or call <strong>1-800-ORTHODOX</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrthodoxMetrics;
