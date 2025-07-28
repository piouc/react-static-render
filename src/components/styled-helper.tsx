
type StyledElement = {
  withConfig: (config: {
    displayName: string;
    componentId: string;
  }) => any;
};

/**
 * Helper function to create styled components with automatic display names
 * This provides similar functionality to babel-plugin-styled-components
 * 
 * @example
 * ```typescript
 * import { withDisplayName } from 'react-static-render/components/styled-helper';
 * 
 * const Button = withDisplayName(styled.button, 'Button')`
 *   background: blue;
 *   color: white;
 * `;
 * ```
 */
export function withDisplayName(
  styledElement: StyledElement,
  displayName: string,
  componentId?: string
) {
  return styledElement.withConfig({
    displayName,
    componentId: componentId || `${displayName}-${Math.random().toString(36).slice(2, 9)}`
  });
}