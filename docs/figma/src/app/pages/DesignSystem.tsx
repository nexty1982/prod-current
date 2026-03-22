import React from 'react';

export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2d1b4e] text-white py-16 px-6">
        <div className="container-2xl">
          <h1 className="text-4xl font-normal" style={{ fontFamily: 'Georgia, serif', lineHeight: '48px' }}>
            Orthodox Metrics Design System
          </h1>
          <p className="mt-4 text-lg opacity-80" style={{ fontFamily: 'Inter, sans-serif' }}>
            Complete design tokens, components, and guidelines for the Orthodox Metrics platform
          </p>
        </div>
      </header>

      <div className="container-2xl py-16">
        {/* Colors Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Colors</h2>
          
          {/* Primary Colors */}
          <div className="mb-12">
            <h3 className="text-h3 mb-6">Primary Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ColorSwatch 
                name="Primary Purple"
                value="#2d1b4e"
                variable="--color-primary-purple"
                bgColor="#2d1b4e"
                textColor="white"
              />
              <ColorSwatch 
                name="Accent Gold"
                value="#d4af37"
                variable="--color-accent-gold"
                bgColor="#d4af37"
                textColor="#2d1b4e"
              />
            </div>
          </div>

          {/* Text Colors */}
          <div className="mb-12">
            <h3 className="text-h3 mb-6">Text Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ColorSwatch 
                name="Text Primary"
                value="#2d1b4e"
                variable="--color-text-primary"
                bgColor="#2d1b4e"
                textColor="white"
              />
              <ColorSwatch 
                name="Text Body"
                value="#4a5565"
                variable="--color-text-body"
                bgColor="#4a5565"
                textColor="white"
              />
              <ColorSwatch 
                name="Text Secondary"
                value="#6a7282"
                variable="--color-text-secondary"
                bgColor="#6a7282"
                textColor="white"
              />
            </div>
          </div>

          {/* Background Colors */}
          <div className="mb-12">
            <h3 className="text-h3 mb-6">Background Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ColorSwatch 
                name="White"
                value="#ffffff"
                variable="--color-bg-white"
                bgColor="#ffffff"
                textColor="#2d1b4e"
                border
              />
              <ColorSwatch 
                name="Gray 50"
                value="#f9fafb"
                variable="--color-bg-gray-50"
                bgColor="#f9fafb"
                textColor="#2d1b4e"
                border
              />
              <ColorSwatch 
                name="Gray 100"
                value="#f3f4f6"
                variable="--color-bg-gray-100"
                bgColor="#f3f4f6"
                textColor="#2d1b4e"
                border
              />
            </div>
          </div>

          {/* Gradients */}
          <div>
            <h3 className="text-h3 mb-6">Gradients</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden shadow-md">
                <div 
                  className="h-32 flex items-center justify-center text-white font-medium"
                  style={{ background: 'var(--gradient-hero-purple)' }}
                >
                  Hero Purple Gradient
                </div>
                <div className="bg-white p-4 border-t">
                  <p className="text-sm text-gray-600 font-mono">--gradient-hero-purple</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden shadow-md">
                <div 
                  className="h-32 flex items-center justify-center text-gray-800 font-medium"
                  style={{ background: 'var(--gradient-card-subtle)' }}
                >
                  Card Subtle Gradient
                </div>
                <div className="bg-white p-4 border-t">
                  <p className="text-sm text-gray-600 font-mono">--gradient-card-subtle</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Typography</h2>
          
          <div className="mb-12">
            <h3 className="text-h3 mb-6">Font Families</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-elevated">
                <p className="text-sm text-gray-600 mb-2">Primary Font</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px' }}>Inter</p>
                <p className="text-sm text-gray-500 font-mono mt-2">--font-family-primary</p>
              </div>
              <div className="card-elevated">
                <p className="text-sm text-gray-600 mb-2">Serif Font</p>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '24px' }}>Georgia</p>
                <p className="text-sm text-gray-500 font-mono mt-2">--font-family-serif</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-h3 mb-6">Text Styles</h3>
            <div className="space-y-6">
              <TypeSample 
                label="H1 - Main Page Headings"
                className="text-h1"
                text="Safeguarding Sacred Records"
                specs="48px / Georgia Regular / -1.2px"
              />
              <TypeSample 
                label="H2 - Section Headings"
                className="text-h2"
                text="Built with Your Parish in Mind"
                specs="48px / Georgia Regular"
              />
              <TypeSample 
                label="H3 - Component Headings"
                className="text-h3"
                text="Preserve History"
                specs="20px / Inter Medium / 28px line-height"
              />
              <TypeSample 
                label="H4 - Small Headings"
                className="text-h4"
                text="Calendar-Aware Scheduling"
                specs="18px / Inter Medium / 26px line-height"
              />
              <TypeSample 
                label="Body Large"
                className="text-body-large"
                text="Every feature is designed to honor Orthodox tradition while providing modern convenience and security."
                specs="20px / Inter Regular / 28px line-height"
              />
              <TypeSample 
                label="Body"
                className="text-body"
                text="Many Orthodox parishes still rely on fragile, handwritten records that are vulnerable to loss, damage, and the passage of time."
                specs="18px / Inter Regular / 29.25px line-height"
              />
              <TypeSample 
                label="Body Small"
                className="text-body-small"
                text="Transform fragile paper records into secure digital archives that will last for generations."
                specs="16px / Inter Regular / 24px line-height"
              />
              <TypeSample 
                label="Small Text"
                className="text-small"
                text="Platform Highlights"
                specs="14px / Inter Regular / 20px line-height"
              />
            </div>
          </div>

          <div>
            <h3 className="text-h3 mb-6">Font Sizes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FontSizeSample size="12px" name="XS" variable="--font-size-xs" />
              <FontSizeSample size="14px" name="SM" variable="--font-size-sm" />
              <FontSizeSample size="16px" name="Base" variable="--font-size-base" />
              <FontSizeSample size="18px" name="LG" variable="--font-size-lg" />
              <FontSizeSample size="20px" name="XL" variable="--font-size-xl" />
              <FontSizeSample size="24px" name="2XL" variable="--font-size-2xl" />
              <FontSizeSample size="32px" name="3XL" variable="--font-size-3xl" />
              <FontSizeSample size="48px" name="4XL" variable="--font-size-4xl" />
            </div>
          </div>
        </section>

        {/* Spacing Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Spacing</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <SpacingSample value="4px" name="1" variable="--spacing-1" />
            <SpacingSample value="8px" name="2" variable="--spacing-2" />
            <SpacingSample value="12px" name="3" variable="--spacing-3" />
            <SpacingSample value="16px" name="4" variable="--spacing-4" />
            <SpacingSample value="24px" name="6" variable="--spacing-6" />
            <SpacingSample value="32px" name="8" variable="--spacing-8" />
            <SpacingSample value="48px" name="12" variable="--spacing-12" />
            <SpacingSample value="64px" name="16" variable="--spacing-16" />
            <SpacingSample value="80px" name="20" variable="--spacing-20" />
            <SpacingSample value="120px" name="30" variable="--spacing-30" />
            <SpacingSample value="140px" name="35" variable="--spacing-35" />
          </div>
        </section>

        {/* Shadows Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Shadows</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ShadowSample 
              name="Small"
              variable="--shadow-sm"
              description="Subtle elevation for cards"
            />
            <ShadowSample 
              name="Medium"
              variable="--shadow-md"
              description="Standard cards and components"
            />
            <ShadowSample 
              name="Large"
              variable="--shadow-lg"
              description="Prominent cards and CTAs"
            />
            <ShadowSample 
              name="Extra Large"
              variable="--shadow-xl"
              description="Hero elements and testimonials"
            />
            <ShadowSample 
              name="2XL"
              variable="--shadow-2xl"
              description="Major CTA sections"
            />
          </div>
        </section>

        {/* Border Radius Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Border Radius</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <RadiusSample value="6px" name="SM" variable="--radius-sm" />
            <RadiusSample value="10px" name="MD" variable="--radius-md" />
            <RadiusSample value="14px" name="LG" variable="--radius-lg" />
            <RadiusSample value="16px" name="XL" variable="--radius-xl" />
            <RadiusSample value="24px" name="2XL" variable="--radius-2xl" />
            <RadiusSample value="9999px" name="Full" variable="--radius-full" />
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Buttons</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-h3 mb-4">Primary Button</h3>
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <button className="btn-primary">Get Started</button>
                <button className="btn-primary" style={{ height: 'var(--size-button-height-lg)' }}>
                  Large Button
                </button>
              </div>
              <div className="card">
                <p className="text-sm text-gray-600">Background: <code className="font-mono">--color-accent-gold</code></p>
                <p className="text-sm text-gray-600">Text: <code className="font-mono">--color-text-on-gold</code></p>
                <p className="text-sm text-gray-600">Height: <code className="font-mono">50px (--size-button-height)</code></p>
                <p className="text-sm text-gray-600">Border Radius: <code className="font-mono">10px (--radius-md)</code></p>
                <p className="text-sm text-gray-600">Shadow: <code className="font-mono">--shadow-md</code></p>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Secondary Button</h3>
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <button className="btn-secondary">Learn More</button>
                <button className="btn-secondary" style={{ height: 'var(--size-button-height-lg)' }}>
                  Large Secondary
                </button>
              </div>
              <div className="card">
                <p className="text-sm text-gray-600">Background: <code className="font-mono">--color-primary-purple</code></p>
                <p className="text-sm text-gray-600">Text: <code className="font-mono">--color-text-on-dark</code></p>
                <p className="text-sm text-gray-600">Height: <code className="font-mono">50px (--size-button-height)</code></p>
              </div>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-h3 mb-4">Default Card</h3>
              <div className="card">
                <h4 className="text-h3 mb-2">Card Title</h4>
                <p className="text-body-small">
                  Standard card with light shadow and subtle border. Perfect for content sections.
                </p>
              </div>
              <div className="mt-4 bg-white p-4 rounded-lg border">
                <p className="text-sm font-mono">Shadow: --shadow-sm</p>
                <p className="text-sm font-mono">Border: 1px solid --color-border-light</p>
                <p className="text-sm font-mono">Radius: --radius-xl (16px)</p>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Elevated Card</h3>
              <div className="card-elevated">
                <h4 className="text-h3 mb-2">Elevated Card</h4>
                <p className="text-body-small">
                  Card with medium shadow for more prominent elevation.
                </p>
              </div>
              <div className="mt-4 bg-white p-4 rounded-lg border">
                <p className="text-sm font-mono">Shadow: --shadow-md</p>
                <p className="text-sm font-mono">Border: 1px solid --color-border-light</p>
                <p className="text-sm font-mono">Radius: --radius-xl (16px)</p>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Large Card</h3>
              <div className="card-large">
                <h4 className="text-h3 mb-2">Large Card</h4>
                <p className="text-body-small">
                  Premium card with large shadow and rounded corners for important sections.
                </p>
              </div>
              <div className="mt-4 bg-white p-4 rounded-lg border">
                <p className="text-sm font-mono">Shadow: --shadow-lg</p>
                <p className="text-sm font-mono">Radius: --radius-2xl (24px)</p>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Highlighted Card</h3>
              <div className="card-highlighted">
                <h4 className="text-h3 mb-2">Highlighted Card</h4>
                <p className="text-body-small">
                  Card with gold accent border for featured content or pricing.
                </p>
              </div>
              <div className="mt-4 bg-white p-4 rounded-lg border">
                <p className="text-sm font-mono">Border: 2px solid --color-border-accent</p>
                <p className="text-sm font-mono">Shadow: --shadow-md</p>
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-h3 mb-4">Default Badge</h3>
              <div className="flex gap-4 mb-4">
                <span className="badge">Platform Highlights</span>
                <span className="badge">Our Purpose</span>
                <span className="badge">Our Journey</span>
              </div>
              <div className="card">
                <p className="text-sm font-mono">Background: --color-primary-purple-10</p>
                <p className="text-sm font-mono">Text: --color-text-primary</p>
                <p className="text-sm font-mono">Radius: --radius-full</p>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Accent Badge</h3>
              <div className="flex gap-4 mb-4">
                <span className="badge-accent">Popular</span>
                <span className="badge-accent">Featured</span>
                <span className="badge-accent">New</span>
              </div>
              <div className="card">
                <p className="text-sm font-mono">Background: --color-accent-gold</p>
                <p className="text-sm font-mono">Text: --color-text-on-gold</p>
                <p className="text-sm font-mono">Shadow: --shadow-md</p>
              </div>
            </div>
          </div>
        </section>

        {/* Icon Containers Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Icon Containers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-h3 mb-4">Purple Container</h3>
              <div className="flex gap-4 mb-4">
                <div className="icon-container-purple">
                  <svg width="32" height="32" fill="none" stroke="#d4af37" strokeWidth="2">
                    <path d="M8 12h16M8 16h16M12 8h8v16h-8z" />
                  </svg>
                </div>
              </div>
              <div className="card">
                <p className="text-sm font-mono">Size: --size-icon-container-lg (64px)</p>
                <p className="text-sm font-mono">Background: --color-primary-purple</p>
                <p className="text-sm font-mono">Radius: --radius-lg (14px)</p>
                <p className="text-sm font-mono">Icon: --color-accent-gold</p>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Gold Container</h3>
              <div className="flex gap-4 mb-4">
                <div className="icon-container-gold">
                  <svg width="32" height="32" fill="none" stroke="#2d1b4e" strokeWidth="2">
                    <circle cx="16" cy="16" r="12" />
                    <path d="M16 8v16M8 16h16" />
                  </svg>
                </div>
              </div>
              <div className="card">
                <p className="text-sm font-mono">Size: --size-icon-container-lg (64px)</p>
                <p className="text-sm font-mono">Background: --color-accent-gold</p>
                <p className="text-sm font-mono">Radius: --radius-lg (14px)</p>
                <p className="text-sm font-mono">Icon: --color-primary-purple</p>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Section */}
        <section className="mb-24">
          <h2 className="text-h2 mb-8">Layout & Grid</h2>
          
          <div className="mb-12">
            <h3 className="text-h3 mb-6">Container Widths</h3>
            <div className="space-y-4">
              <ContainerSample width="640px" name="SM" variable="--container-sm" />
              <ContainerSample width="768px" name="MD" variable="--container-md" />
              <ContainerSample width="1024px" name="LG" variable="--container-lg" />
              <ContainerSample width="1200px" name="XL" variable="--container-xl" />
              <ContainerSample width="1280px" name="2XL" variable="--container-2xl" />
            </div>
          </div>

          <div>
            <h3 className="text-h3 mb-6">12-Column Grid</h3>
            <div className="card-elevated">
              <p className="text-body-small mb-4">
                Standard 12-column grid with 32px gutter spacing
              </p>
              <div className="grid grid-cols-12 gap-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-[#d4af37] h-16 rounded flex items-center justify-center text-white font-medium">
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-mono">Columns: --grid-columns (12)</p>
                <p className="text-sm font-mono">Gutter: --grid-gutter (32px)</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-[#2d1b4e] text-white py-12 px-6 mt-24">
        <div className="container-2xl text-center">
          <p className="text-sm opacity-80">
            Orthodox Metrics Design System · Version 1.0.0
          </p>
          <p className="text-sm opacity-60 mt-2">
            Single source of truth for all design tokens and components
          </p>
        </div>
      </footer>
    </div>
  );
}

// Helper Components

function ColorSwatch({ 
  name, 
  value, 
  variable, 
  bgColor, 
  textColor, 
  border 
}: { 
  name: string; 
  value: string; 
  variable: string; 
  bgColor: string; 
  textColor: string;
  border?: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden shadow-md">
      <div 
        className="h-32 flex items-center justify-center font-medium"
        style={{ 
          backgroundColor: bgColor, 
          color: textColor,
          border: border ? '1px solid #e5e7eb' : 'none'
        }}
      >
        {name}
      </div>
      <div className="bg-white p-4 border-t">
        <p className="text-sm font-mono text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-1 font-mono">{variable}</p>
      </div>
    </div>
  );
}

function TypeSample({ 
  label, 
  className, 
  text, 
  specs 
}: { 
  label: string; 
  className: string; 
  text: string; 
  specs: string;
}) {
  return (
    <div className="card-elevated">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p className={className}>{text}</p>
      <p className="text-xs text-gray-500 mt-3 font-mono">{specs}</p>
    </div>
  );
}

function FontSizeSample({ 
  size, 
  name, 
  variable 
}: { 
  size: string; 
  name: string; 
  variable: string;
}) {
  return (
    <div className="card text-center">
      <p style={{ fontSize: size, fontFamily: 'Inter, sans-serif' }}>Aa</p>
      <p className="text-sm text-gray-600 mt-2">{name}</p>
      <p className="text-xs text-gray-500 font-mono">{size}</p>
      <p className="text-xs text-gray-400 font-mono">{variable}</p>
    </div>
  );
}

function SpacingSample({ 
  value, 
  name, 
  variable 
}: { 
  value: string; 
  name: string; 
  variable: string;
}) {
  return (
    <div className="card">
      <div 
        className="bg-[#d4af37] rounded"
        style={{ width: value, height: value, maxWidth: '100%' }}
      />
      <p className="text-sm text-gray-600 mt-3">{name}</p>
      <p className="text-xs text-gray-500 font-mono">{value}</p>
      <p className="text-xs text-gray-400 font-mono">{variable}</p>
    </div>
  );
}

function ShadowSample({ 
  name, 
  variable, 
  description 
}: { 
  name: string; 
  variable: string; 
  description: string;
}) {
  return (
    <div>
      <div 
        className="bg-white rounded-xl p-8 flex items-center justify-center h-40"
        style={{ boxShadow: `var(${variable})` }}
      >
        <p className="text-h3">{name}</p>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-500 font-mono mt-1">{variable}</p>
      </div>
    </div>
  );
}

function RadiusSample({ 
  value, 
  name, 
  variable 
}: { 
  value: string; 
  name: string; 
  variable: string;
}) {
  return (
    <div className="card">
      <div 
        className="bg-[#2d1b4e] w-full h-24"
        style={{ borderRadius: value }}
      />
      <p className="text-sm text-gray-600 mt-3">{name}</p>
      <p className="text-xs text-gray-500 font-mono">{value}</p>
      <p className="text-xs text-gray-400 font-mono">{variable}</p>
    </div>
  );
}

function ContainerSample({ 
  width, 
  name, 
  variable 
}: { 
  width: string; 
  name: string; 
  variable: string;
}) {
  return (
    <div>
      <div className="bg-[#f9fafb] border-2 border-[#d4af37] rounded-lg p-6" style={{ maxWidth: width }}>
        <div className="bg-white rounded p-4">
          <p className="text-h4">{name} Container</p>
          <p className="text-sm text-gray-600 mt-2">Max width: {width}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">{variable}</p>
        </div>
      </div>
    </div>
  );
}
