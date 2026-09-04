import { Logger } from '@nestjs/common';

// The SUT logs handled failures (e.g. a mailer error the consumer records
// and retries). Keep that out of the test output.
const noop = () => undefined;
for (const method of [
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
  'fatal',
] as const) {
  jest.spyOn(Logger.prototype, method).mockImplementation(noop);
}
