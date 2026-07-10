import { render, screen } from '@testing-library/react';
import App from '../../app/App';
import { AppProviders } from '../../app/providers/AppProviders';
import authService from '../../features/auth/services/authService';

jest.mock('../../features/auth/services/authService', () => ({
  __esModule: true,
  default: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
}));

beforeEach(() => {
  authService.getSession.mockResolvedValue({ data: { session: null } });
  authService.onAuthStateChange.mockImplementation(() => () => {});
});

test('renders the login screen for an unauthenticated user', async () => {
  render(
    <AppProviders>
      <App />
    </AppProviders>
  );

  expect(await screen.findByText(/financeiro/i)).toBeInTheDocument();
});
