import { ComponentInfo } from '../hooks/useComponentRegistry';
import { DetectedIssue, IssueType } from './errorClassifier';

export enum FixStrategyType {
  SMART_PATCH = 'SMART_PATCH',
  AI_REWRITE = 'AI_REWRITE',
  CSS_CORRECTION = 'CSS_CORRECTION',
  PROP_FIX = 'PROP_FIX',
  LAYOUT_FIX = 'LAYOUT_FIX',
  ACCESSIBILITY_FIX = 'ACCESSIBILITY_FIX'
}

export interface FixStrategy {
  id: string;
  type: FixStrategyType;
  name: string;
  description: string;
  confidence: number;
  apply: (component: ComponentInfo, issue: DetectedIssue) => Promise<FixResult>;
  rollback?: () => Promise<void>;
  metadata?: Record<string, any>;
}

export interface FixResult {
  id: string;
  success: boolean;
  strategy: FixStrategy;
  appliedChanges: AppliedChange[];
  error?: string;
  rollback?: () => Promise<void>;
  metadata?: Record<string, any>;
}

export interface AppliedChange {
  type: 'prop' | 'style' | 'attribute' | 'class' | 'content';
  target: string;
  oldValue?: any;
  newValue: any;
  description: string;
}

export class RecoveryActions {
  private strategies: Map<IssueType, FixStrategy[]> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize fix strategies for different issue types
   */
  private initializeStrategies(): void {
    // Rendering issues
    this.addStrategies(IssueType.RENDER_ERROR, [
      this.createPropFixStrategy(),
      this.createSmartPatchStrategy()
    ]);

    this.addStrategies(IssueType.MISSING_KEY, [
      this.createKeyFixStrategy()
    ]);

    this.addStrategies(IssueType.UNBOUND_PROP, [
      this.createPropFixStrategy(),
      this.createDefaultValueStrategy()
    ]);

    // Layout issues
    this.addStrategies(IssueType.LAYOUT_BREAK, [
      this.createLayoutFixStrategy(),
      this.createCSSFixStrategy()
    ]);

    this.addStrategies(IssueType.ZERO_DIMENSIONS, [
      this.createDimensionFixStrategy(),
      this.createLayoutFixStrategy()
    ]);

    // Accessibility issues
    this.addStrategies(IssueType.MISSING_ARIA_LABEL, [
      this.createAccessibilityFixStrategy()
    ]);

    // Styling issues
    this.addStrategies(IssueType.CONFLICTING_CSS, [
      this.createCSSFixStrategy(),
      this.createSmartPatchStrategy()
    ]);
  }

  /**
   * Get fix strategy for an issue
   */
  getFixStrategy(issue: DetectedIssue): FixStrategy | undefined {
    const strategies = this.strategies.get(issue.type);
    if (!strategies || strategies.length === 0) {
      return undefined;
    }

    // Return the strategy with highest confidence
    return strategies.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Get all strategies for an issue type
   */
  getStrategiesForIssue(issueType: IssueType): FixStrategy[] {
    return this.strategies.get(issueType) || [];
  }

  /**
   * Apply a fix using the specified strategy
   */
  async applyFix(
    component: ComponentInfo,
    issue: DetectedIssue,
    strategy: FixStrategy
  ): Promise<FixResult> {
    try {
      const result = await strategy.apply(component, issue);
      
      // Add rollback function if strategy provides one
      if (strategy.rollback) {
        result.rollback = strategy.rollback;
      }

      return result;
    } catch (error) {
      return {
        id: this.generateFixId(),
        success: false,
        strategy,
        appliedChanges: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create smart patch strategy
   */
  private createSmartPatchStrategy(): FixStrategy {
    return {
      id: 'smart-patch',
      type: FixStrategyType.SMART_PATCH,
      name: 'Smart Patch',
      description: 'Apply intelligent fixes based on component analysis',
      confidence: 0.7,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];
        const element = component.element;

        if (!element) {
          throw new Error('Component element not found');
        }

        // Apply smart fixes based on issue type
        switch (issue.type) {
          case IssueType.RENDER_ERROR:
            // Try to fix common render issues
            if (component.props.onClick && typeof component.props.onClick !== 'function') {
              changes.push({
                type: 'prop',
                target: 'onClick',
                oldValue: component.props.onClick,
                newValue: () => {},
                description: 'Fixed invalid onClick handler'
              });
            }
            break;

          case IssueType.CONFLICTING_CSS:
            // Remove conflicting CSS classes
            const conflictingClasses = issue.metadata?.conflictingClasses || [];
            for (const conflict of conflictingClasses) {
              if (conflict.includes('display-none')) {
                element.classList.remove('hidden', 'display-none');
                changes.push({
                  type: 'class',
                  target: 'display-none',
                  oldValue: 'hidden display-none',
                  newValue: '',
                  description: 'Removed conflicting display-none classes'
                });
              }
            }
            break;
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createSmartPatchStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Create prop fix strategy
   */
  private createPropFixStrategy(): FixStrategy {
    return {
      id: 'prop-fix',
      type: FixStrategyType.PROP_FIX,
      name: 'Property Fix',
      description: 'Fix component properties and bindings',
      confidence: 0.8,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];

        // Fix undefined/null props
        const unboundProps = issue.metadata?.unboundProps || [];
        for (const propName of unboundProps) {
          const defaultValue = this.getDefaultValueForProp(propName, component);
          changes.push({
            type: 'prop',
            target: propName,
            oldValue: component.props[propName],
            newValue: defaultValue,
            description: `Set default value for ${propName}`
          });
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createPropFixStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Create key fix strategy
   */
  private createKeyFixStrategy(): FixStrategy {
    return {
      id: 'key-fix',
      type: FixStrategyType.SMART_PATCH,
      name: 'Key Fix',
      description: 'Add missing key props to list items',
      confidence: 0.9,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];
        const element = component.element;

        if (!element) {
          throw new Error('Component element not found');
        }

        const listItems = element.querySelectorAll('li, [role="listitem"], .MuiListItem-root');
        let keyIndex = 0;

        for (const item of listItems) {
          if (!item.getAttribute('key') && !item.getAttribute('data-key')) {
            const key = `item-${keyIndex++}`;
            item.setAttribute('data-key', key);
            changes.push({
              type: 'attribute',
              target: 'data-key',
              oldValue: null,
              newValue: key,
              description: `Added key prop to list item ${keyIndex}`
            });
          }
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createKeyFixStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Create layout fix strategy
   */
  private createLayoutFixStrategy(): FixStrategy {
    return {
      id: 'layout-fix',
      type: FixStrategyType.LAYOUT_FIX,
      name: 'Layout Fix',
      description: 'Fix layout and positioning issues',
      confidence: 0.6,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];
        const element = component.element;

        if (!element) {
          throw new Error('Component element not found');
        }

        const computedStyle = window.getComputedStyle(element);

        // Fix overflow issues
        if (computedStyle.overflow === 'hidden' && element.scrollHeight > element.clientHeight) {
          element.style.overflow = 'auto';
          changes.push({
            type: 'style',
            target: 'overflow',
            oldValue: 'hidden',
            newValue: 'auto',
            description: 'Changed overflow from hidden to auto to prevent content cutoff'
          });
        }

        // Fix positioning issues
        if (computedStyle.position === 'absolute' && !element.offsetParent) {
          const parent = element.parentElement;
          if (parent && computedStyle.position !== 'relative') {
            parent.style.position = 'relative';
            changes.push({
              type: 'style',
              target: 'position',
              oldValue: computedStyle.position,
              newValue: 'relative',
              description: 'Set parent element position to relative for proper absolute positioning'
            });
          }
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createLayoutFixStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Create dimension fix strategy
   */
  private createDimensionFixStrategy(): FixStrategy {
    return {
      id: 'dimension-fix',
      type: FixStrategyType.LAYOUT_FIX,
      name: 'Dimension Fix',
      description: 'Fix zero dimension issues',
      confidence: 0.8,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];
        const element = component.element;

        if (!element) {
          throw new Error('Component element not found');
        }

        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        // Fix zero width
        if (rect.width === 0) {
          if (computedStyle.display === 'none') {
            element.style.display = 'block';
            changes.push({
              type: 'style',
              target: 'display',
              oldValue: 'none',
              newValue: 'block',
              description: 'Changed display from none to block to make element visible'
            });
          } else {
            element.style.width = 'auto';
            element.style.minWidth = '100px';
            changes.push({
              type: 'style',
              target: 'width',
              oldValue: '0px',
              newValue: 'auto',
              description: 'Set width to auto with minimum width to ensure visibility'
            });
          }
        }

        // Fix zero height
        if (rect.height === 0) {
          element.style.height = 'auto';
          element.style.minHeight = '20px';
          changes.push({
            type: 'style',
            target: 'height',
            oldValue: '0px',
            newValue: 'auto',
            description: 'Set height to auto with minimum height to ensure visibility'
          });
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createDimensionFixStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Create accessibility fix strategy
   */
  private createAccessibilityFixStrategy(): FixStrategy {
    return {
      id: 'accessibility-fix',
      type: FixStrategyType.ACCESSIBILITY_FIX,
      name: 'Accessibility Fix',
      description: 'Fix accessibility issues',
      confidence: 0.7,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];
        const element = component.element;

        if (!element) {
          throw new Error('Component element not found');
        }

        const interactiveElements = element.querySelectorAll('button, input, select, textarea, [role="button"], [role="link"]');

        for (const el of interactiveElements) {
          const hasAriaLabel = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
          const hasTextContent = el.textContent?.trim().length > 0;
          const hasAltText = el.hasAttribute('alt');

          if (!hasAriaLabel && !hasTextContent && !hasAltText) {
            // Generate descriptive label based on element type and context
            const label = this.generateAccessibilityLabel(el as HTMLElement);
            el.setAttribute('aria-label', label);
            
            changes.push({
              type: 'attribute',
              target: 'aria-label',
              oldValue: null,
              newValue: label,
              description: `Added aria-label "${label}" to ${el.tagName.toLowerCase()}`
            });
          }
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createAccessibilityFixStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Create CSS fix strategy
   */
  private createCSSFixStrategy(): FixStrategy {
    return {
      id: 'css-fix',
      type: FixStrategyType.CSS_CORRECTION,
      name: 'CSS Fix',
      description: 'Fix CSS styling issues',
      confidence: 0.6,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];
        const element = component.element;

        if (!element) {
          throw new Error('Component element not found');
        }

        // Remove conflicting CSS classes
        if (issue.metadata?.conflictingClasses) {
          const conflictingClasses = issue.metadata.conflictingClasses;
          for (const conflict of conflictingClasses) {
            if (conflict.includes('display-none')) {
              element.classList.remove('hidden', 'display-none', 'd-none');
              changes.push({
                type: 'class',
                target: 'display-none',
                oldValue: 'hidden display-none d-none',
                newValue: '',
                description: 'Removed conflicting display-none classes'
              });
            }
          }
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createCSSFixStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Create default value strategy
   */
  private createDefaultValueStrategy(): FixStrategy {
    return {
      id: 'default-value',
      type: FixStrategyType.PROP_FIX,
      name: 'Default Value',
      description: 'Set default values for undefined props',
      confidence: 0.8,
      apply: async (component: ComponentInfo, issue: DetectedIssue): Promise<FixResult> => {
        const changes: AppliedChange[] = [];

        // Set default values for common props
        const defaultProps = {
          disabled: false,
          required: false,
          readOnly: false,
          placeholder: '',
          value: '',
          defaultValue: ''
        };

        for (const [propName, defaultValue] of Object.entries(defaultProps)) {
          if (component.props[propName] === undefined || component.props[propName] === null) {
            changes.push({
              type: 'prop',
              target: propName,
              oldValue: component.props[propName],
              newValue: defaultValue,
              description: `Set default value for ${propName}`
            });
          }
        }

        return {
          id: this.generateFixId(),
          success: changes.length > 0,
          strategy: this.createDefaultValueStrategy(),
          appliedChanges: changes
        };
      }
    };
  }

  /**
   * Add strategies for an issue type
   */
  private addStrategies(issueType: IssueType, strategies: FixStrategy[]): void {
    this.strategies.set(issueType, strategies);
  }

  /**
   * Get default value for a prop
   */
  private getDefaultValueForProp(propName: string, component: ComponentInfo): any {
    const defaultValues: Record<string, any> = {
      disabled: false,
      required: false,
      readOnly: false,
      placeholder: '',
      value: '',
      defaultValue: '',
      onClick: () => {},
      onChange: () => {},
      onSubmit: () => {},
      onBlur: () => {},
      onFocus: () => {},
      className: '',
      style: {},
      children: null
    };

    return defaultValues[propName] ?? null;
  }

  /**
   * Generate accessibility label for an element
   */
  private generateAccessibilityLabel(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const type = element.getAttribute('type');
    const placeholder = element.getAttribute('placeholder');
    const name = element.getAttribute('name');
    const id = element.getAttribute('id');

    if (placeholder) {
      return placeholder;
    }

    if (name) {
      return `${tagName} ${name}`;
    }

    if (id) {
      return `${tagName} ${id}`;
    }

    if (role) {
      return `${role} element`;
    }

    if (type) {
      return `${tagName} ${type}`;
    }

    return `${tagName} element`;
  }

  /**
   * Generate unique fix ID
   */
  private generateFixId(): string {
    return `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add custom strategy
   */
  addCustomStrategy(issueType: IssueType, strategy: FixStrategy): void {
    const existing = this.strategies.get(issueType) || [];
    existing.push(strategy);
    this.strategies.set(issueType, existing);
  }
} 