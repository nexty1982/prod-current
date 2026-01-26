import { ComponentInfo } from '../hooks/useComponentRegistry';

export enum IssueSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export enum IssueType {
  // Rendering issues
  RENDER_ERROR = 'RENDER_ERROR',
  MISSING_KEY = 'MISSING_KEY',
  UNBOUND_PROP = 'UNBOUND_PROP',
  INVALID_PROP_TYPE = 'INVALID_PROP_TYPE',
  
  // Layout issues
  LAYOUT_BREAK = 'LAYOUT_BREAK',
  OVERFLOW_HIDDEN = 'OVERFLOW_HIDDEN',
  ZERO_DIMENSIONS = 'ZERO_DIMENSIONS',
  NEGATIVE_MARGINS = 'NEGATIVE_MARGINS',
  
  // Accessibility issues
  MISSING_ARIA_LABEL = 'MISSING_ARIA_LABEL',
  MISSING_ALT_TEXT = 'MISSING_ALT_TEXT',
  INVALID_ROLE = 'INVALID_ROLE',
  
  // Performance issues
  MEMORY_LEAK = 'MEMORY_LEAK',
  UNNECESSARY_RERENDERS = 'UNNECESSARY_RERENDERS',
  LARGE_BUNDLE_SIZE = 'LARGE_BUNDLE_SIZE',
  
  // Styling issues
  CONFLICTING_CSS = 'CONFLICTING_CSS',
  MISSING_STYLES = 'MISSING_STYLES',
  INVALID_COLOR = 'INVALID_COLOR',
  
  // API/Data issues
  API_ERROR = 'API_ERROR',
  MISSING_DATA = 'MISSING_DATA',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  
  // Event handling issues
  MISSING_EVENT_HANDLER = 'MISSING_EVENT_HANDLER',
  INVALID_EVENT_TYPE = 'INVALID_EVENT_TYPE',
  
  // State management issues
  STATE_INCONSISTENCY = 'STATE_INCONSISTENCY',
  MISSING_DEPENDENCIES = 'MISSING_DEPENDENCIES',
  
  // Custom issues
  CUSTOM_ISSUE = 'CUSTOM_ISSUE'
}

export interface DetectedIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  componentId: string;
  componentName: string;
  element?: HTMLElement;
  props?: Record<string, any>;
  cssClasses?: string[];
  position?: { x: number; y: number; width: number; height: number };
  confidence: number;
  suggestions: string[];
  metadata?: Record<string, any>;
}

export interface IssuePattern {
  type: IssueType;
  severity: IssueSeverity;
  patterns: RegExp[];
  detector: (component: ComponentInfo) => Promise<DetectedIssue[]>;
  confidence: number;
}

export class ErrorClassifier {
  private issuePatterns: IssuePattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize issue detection patterns
   */
  private initializePatterns(): void {
    this.issuePatterns = [
      // Rendering issues
      {
        type: IssueType.RENDER_ERROR,
        severity: IssueSeverity.CRITICAL,
        patterns: [
          /Error: React\.createElement/,
          /TypeError: Cannot read property/,
          /ReferenceError: .* is not defined/
        ],
        detector: this.detectRenderErrors.bind(this),
        confidence: 0.9
      },
      {
        type: IssueType.MISSING_KEY,
        severity: IssueSeverity.WARNING,
        patterns: [
          /Warning: Each child in a list should have a unique "key" prop/,
          /Warning: Missing key prop for element in array/
        ],
        detector: this.detectMissingKeys.bind(this),
        confidence: 0.8
      },
      {
        type: IssueType.UNBOUND_PROP,
        severity: IssueSeverity.WARNING,
        patterns: [
          /Warning: Failed prop type/,
          /Warning: Invalid prop.*supplied to/
        ],
        detector: this.detectUnboundProps.bind(this),
        confidence: 0.7
      },

      // Layout issues
      {
        type: IssueType.LAYOUT_BREAK,
        severity: IssueSeverity.WARNING,
        patterns: [
          /overflow: hidden/,
          /position: absolute/,
          /z-index: -1/
        ],
        detector: this.detectLayoutIssues.bind(this),
        confidence: 0.6
      },
      {
        type: IssueType.ZERO_DIMENSIONS,
        severity: IssueSeverity.WARNING,
        patterns: [
          /width: 0/,
          /height: 0/,
          /min-width: 0/,
          /min-height: 0/
        ],
        detector: this.detectZeroDimensions.bind(this),
        confidence: 0.8
      },

      // Accessibility issues
      {
        type: IssueType.MISSING_ARIA_LABEL,
        severity: IssueSeverity.WARNING,
        patterns: [
          /aria-label/,
          /aria-labelledby/,
          /role=/
        ],
        detector: this.detectAccessibilityIssues.bind(this),
        confidence: 0.7
      },

      // Styling issues
      {
        type: IssueType.CONFLICTING_CSS,
        severity: IssueSeverity.INFO,
        patterns: [
          /!important/,
          /display: none/,
          /visibility: hidden/
        ],
        detector: this.detectStylingIssues.bind(this),
        confidence: 0.5
      }
    ];
  }

  /**
   * Detect all issues for a component
   */
  async detectIssues(component: ComponentInfo): Promise<DetectedIssue[]> {
    const allIssues: DetectedIssue[] = [];

    // Run all detectors
    for (const pattern of this.issuePatterns) {
      try {
        const issues = await pattern.detector(component);
        allIssues.push(...issues);
      } catch (error) {
        console.warn(`Error in detector for ${pattern.type}:`, error);
      }
    }

    // Remove duplicates and sort by severity
    return this.deduplicateIssues(allIssues);
  }

  /**
   * Prioritize issues by severity
   */
  prioritizeIssues(issues: DetectedIssue[]): DetectedIssue[] {
    const severityOrder = {
      [IssueSeverity.CRITICAL]: 3,
      [IssueSeverity.WARNING]: 2,
      [IssueSeverity.INFO]: 1
    };

    return issues.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // If same severity, sort by confidence
      return b.confidence - a.confidence;
    });
  }

  /**
   * Detect render errors
   */
  private async detectRenderErrors(component: ComponentInfo): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const element = component.element;

    if (!element) return issues;

    // Check for React error boundaries
    const errorBoundary = element.closest('[data-error-boundary]');
    if (errorBoundary) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.RENDER_ERROR,
        severity: IssueSeverity.CRITICAL,
        message: 'Component is wrapped in error boundary, indicating potential render issues',
        componentId: component.id,
        componentName: component.name,
        element,
        confidence: 0.8,
        suggestions: [
          'Check component props for undefined or null values',
          'Verify all required dependencies are properly imported',
          'Review component lifecycle methods'
        ]
      });
    }

    // Check for console errors in component
    const hasConsoleErrors = this.checkForConsoleErrors(component);
    if (hasConsoleErrors) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.RENDER_ERROR,
        severity: IssueSeverity.CRITICAL,
        message: 'Console errors detected for this component',
        componentId: component.id,
        componentName: component.name,
        element,
        confidence: 0.9,
        suggestions: [
          'Check browser console for specific error messages',
          'Verify all props are properly typed',
          'Ensure all required dependencies are available'
        ]
      });
    }

    return issues;
  }

  /**
   * Detect missing keys in lists
   */
  private async detectMissingKeys(component: ComponentInfo): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const element = component.element;

    if (!element) return issues;

    // Check for list items without keys
    const listItems = element.querySelectorAll('li, [role="listitem"], .MuiListItem-root');
    const itemsWithoutKeys = Array.from(listItems).filter(item => {
      return !item.getAttribute('key') && !item.getAttribute('data-key');
    });

    if (itemsWithoutKeys.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.MISSING_KEY,
        severity: IssueSeverity.WARNING,
        message: `${itemsWithoutKeys.length} list items missing key props`,
        componentId: component.id,
        componentName: component.name,
        element,
        confidence: 0.8,
        suggestions: [
          'Add unique key props to all list items',
          'Use stable identifiers like IDs or indexes',
          'Consider using React.Fragment for complex keys'
        ],
        metadata: {
          itemsWithoutKeys: itemsWithoutKeys.length
        }
      });
    }

    return issues;
  }

  /**
   * Detect unbound props
   */
  private async detectUnboundProps(component: ComponentInfo): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    // Check for undefined or null props
    const unboundProps = Object.entries(component.props).filter(([key, value]) => {
      return value === undefined || value === null;
    });

    if (unboundProps.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.UNBOUND_PROP,
        severity: IssueSeverity.WARNING,
        message: `${unboundProps.length} props are undefined or null`,
        componentId: component.id,
        componentName: component.name,
        props: component.props,
        confidence: 0.7,
        suggestions: [
          'Provide default values for optional props',
          'Add prop validation using PropTypes or TypeScript',
          'Check parent component for missing prop passing'
        ],
        metadata: {
          unboundProps: unboundProps.map(([key]) => key)
        }
      });
    }

    return issues;
  }

  /**
   * Detect layout issues
   */
  private async detectLayoutIssues(component: ComponentInfo): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const element = component.element;

    if (!element) return issues;

    const computedStyle = window.getComputedStyle(element);
    const position = computedStyle.position;
    const overflow = computedStyle.overflow;
    const zIndex = parseInt(computedStyle.zIndex);

    // Check for problematic layout properties
    if (overflow === 'hidden' && element.scrollHeight > element.clientHeight) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.LAYOUT_BREAK,
        severity: IssueSeverity.WARNING,
        message: 'Content overflow is hidden, potentially cutting off important content',
        componentId: component.id,
        componentName: component.name,
        element,
        confidence: 0.6,
        suggestions: [
          'Consider using overflow: auto instead of hidden',
          'Add proper padding or margins to prevent overflow',
          'Implement responsive design patterns'
        ]
      });
    }

    if (position === 'absolute' && !element.offsetParent) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.LAYOUT_BREAK,
        severity: IssueSeverity.WARNING,
        message: 'Absolutely positioned element without positioned parent',
        componentId: component.id,
        componentName: component.name,
        element,
        confidence: 0.7,
        suggestions: [
          'Ensure parent element has position: relative',
          'Consider using position: fixed if appropriate',
          'Review layout structure for proper positioning context'
        ]
      });
    }

    if (zIndex < 0) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.LAYOUT_BREAK,
        severity: IssueSeverity.INFO,
        message: 'Negative z-index may cause element to be hidden behind others',
        componentId: component.id,
        componentName: component.name,
        element,
        confidence: 0.5,
        suggestions: [
          'Use positive z-index values for proper layering',
          'Review stacking context hierarchy',
          'Consider using CSS Grid or Flexbox for layout'
        ]
      });
    }

    return issues;
  }

  /**
   * Detect zero dimensions
   */
  private async detectZeroDimensions(component: ComponentInfo): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const element = component.element;

    if (!element) return issues;

    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    if (rect.width === 0 || rect.height === 0) {
      issues.push({
        id: this.generateIssueId(),
        type: IssueType.ZERO_DIMENSIONS,
        severity: IssueSeverity.WARNING,
        message: 'Component has zero dimensions and may not be visible',
        componentId: component.id,
        componentName: component.name,
        element,
        position: component.position,
        confidence: 0.8,
        suggestions: [
          'Add explicit width and height styles',
          'Check if parent container provides proper dimensions',
          'Verify content is not empty or hidden'
        ],
        metadata: {
          width: rect.width,
          height: rect.height,
          display: computedStyle.display,
          visibility: computedStyle.visibility
        }
      });
    }

    return issues;
  }

  /**
   * Detect accessibility issues
   */
  private async detectAccessibilityIssues(component: ComponentInfo): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const element = component.element;

    if (!element) return issues;

    // Check for interactive elements without proper labels
    const interactiveElements = element.querySelectorAll('button, input, select, textarea, [role="button"], [role="link"]');
    
    for (const el of interactiveElements) {
      const hasAriaLabel = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
      const hasTextContent = el.textContent?.trim().length > 0;
      const hasAltText = el.hasAttribute('alt');

      if (!hasAriaLabel && !hasTextContent && !hasAltText) {
        issues.push({
          id: this.generateIssueId(),
          type: IssueType.MISSING_ARIA_LABEL,
          severity: IssueSeverity.WARNING,
          message: 'Interactive element missing accessibility label',
          componentId: component.id,
          componentName: component.name,
          element: el as HTMLElement,
          confidence: 0.7,
          suggestions: [
            'Add aria-label attribute with descriptive text',
            'Use aria-labelledby to reference existing label',
            'Add visible text content to the element'
          ],
          metadata: {
            elementType: el.tagName.toLowerCase(),
            role: el.getAttribute('role')
          }
        });
      }
    }

    return issues;
  }

  /**
   * Detect styling issues
   */
  private async detectStylingIssues(component: ComponentInfo): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const element = component.element;

    if (!element) return issues;

    // Check for conflicting CSS classes
    if (component.cssClasses && component.cssClasses.length > 0) {
      const conflictingClasses = this.findConflictingClasses(component.cssClasses);
      
      if (conflictingClasses.length > 0) {
        issues.push({
          id: this.generateIssueId(),
          type: IssueType.CONFLICTING_CSS,
          severity: IssueSeverity.INFO,
          message: 'Potential CSS class conflicts detected',
          componentId: component.id,
          componentName: component.name,
          element,
          cssClasses: component.cssClasses,
          confidence: 0.5,
          suggestions: [
            'Review CSS specificity and cascade order',
            'Use CSS-in-JS or styled-components for better isolation',
            'Consider using CSS modules or scoped styles'
          ],
          metadata: {
            conflictingClasses
          }
        });
      }
    }

    return issues;
  }

  /**
   * Check for console errors related to component
   */
  private checkForConsoleErrors(component: ComponentInfo): boolean {
    // This would typically integrate with error monitoring
    // For now, we'll return false as a placeholder
    return false;
  }

  /**
   * Find conflicting CSS classes
   */
  private findConflictingClasses(cssClasses: string[]): string[] {
    const conflicts: string[] = [];
    
    // Check for common conflicting patterns
    const hasDisplayNone = cssClasses.some(cls => cls.includes('hidden') || cls.includes('display-none'));
    const hasDisplayBlock = cssClasses.some(cls => cls.includes('block') || cls.includes('flex'));
    
    if (hasDisplayNone && hasDisplayBlock) {
      conflicts.push('display-none vs display-block');
    }

    return conflicts;
  }

  /**
   * Remove duplicate issues
   */
  private deduplicateIssues(issues: DetectedIssue[]): DetectedIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.type}-${issue.componentId}-${issue.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate unique issue ID
   */
  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get issue pattern by type
   */
  getIssuePattern(type: IssueType): IssuePattern | undefined {
    return this.issuePatterns.find(pattern => pattern.type === type);
  }

  /**
   * Add custom issue pattern
   */
  addIssuePattern(pattern: IssuePattern): void {
    this.issuePatterns.push(pattern);
  }
} 