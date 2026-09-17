declare const jest: {
  setTimeout: (ms: number) => void;
  fn: <T extends (...args: unknown[]) => unknown>(implementation?: T) => T;
};

jest.setTimeout(10000);

const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};