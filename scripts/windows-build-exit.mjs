// Vinext beta.5 calls process.exit(0) immediately after closing its prerender
// server. On Windows this races pending native worker close callbacks and causes
// a libuv UV_HANDLE_CLOSING assertion. Let successful builds drain naturally;
// preserve every nonzero exit and exception. This does not suppress build errors.
if (process.platform === 'win32') {
  const exit = process.exit.bind(process);
  process.exit = (code = 0) => {
    if (Number(code) !== 0) return exit(code);
    process.exitCode = 0;
  };
}
