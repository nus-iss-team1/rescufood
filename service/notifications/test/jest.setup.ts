import { Logger } from '@nestjs/common';

// Several specs drive the SUT's error-handling paths on purpose (a mailer
// that throws, a DB blip, a bad message). The SUT logs those by design;
// keep them out of the test output.
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
