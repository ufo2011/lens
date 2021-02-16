import logger from "./logger";

/**
 * Installs Electron developer tools in the development build.
 * The dependency is not bundled to the production build.
 */
export async function installDeveloperTools(): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    logger.info("🤓 Installing developer tools");
  }

  try {
    const { default: devToolsInstaller, REACT_DEVELOPER_TOOLS } = await import("electron-devtools-installer");
    const name = await devToolsInstaller([REACT_DEVELOPER_TOOLS]);

    logger.info(`[DEVTOOLS-INSTALLER]: installed devtools ${name}`);
  } catch (error) {
    logger.error(`[DEVTOOLS-INSTALLER]: failed`, { error });
  }
}
