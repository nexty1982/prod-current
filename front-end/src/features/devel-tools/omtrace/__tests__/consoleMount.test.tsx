import { render, screen } from '@testing-library/react';
import OmtraceConsole from '../OmtraceConsole.tsx';

describe('OMTraceConsole', () => {
  it('mounts OmtraceConsole', () => {
    render(<OmtraceConsole />);
    // Check for the main heading
    expect(screen.getByText(/OMTrace Console/i)).toBeTruthy();
    // Check for the description
    expect(screen.getByText(/Component dependency analysis and intelligent refactoring/i)).toBeTruthy();
    // Check for the console ready message
    expect(screen.getByText(/Console Ready/i)).toBeTruthy();
  });
});
