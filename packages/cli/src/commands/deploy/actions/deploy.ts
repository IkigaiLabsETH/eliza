/**
 * Deploy Action - Main deployment logic
 */

import { logger } from "@elizaos/core";
import * as path from "node:path";
import * as fs from "node:fs";
import dotenv from "dotenv";
import type { DeployOptions, DeploymentResult, ContainerConfig } from "../types";
import {
  buildDockerImage,
  checkDockerAvailable,
  generateDefaultDockerfile,
} from "../utils/docker";
import {
  CloudApiClient,
  getApiCredentials,
} from "../utils/api-client";
import { detectDirectoryType } from "@/src/utils/directory-detection";

/**
 * Main deployment handler
 */
export async function deployProject(
  options: DeployOptions,
): Promise<DeploymentResult> {
  try {
    // Load .env files from current directory and parent directories
    const cwd = process.cwd();
    const envPaths = [
      path.join(cwd, ".env"),
      path.join(cwd, ".env.local"),
      path.join(cwd, "..", ".env"),
      path.join(cwd, "..", ".env.local"),
      path.join(cwd, "../..", ".env"),
      path.join(cwd, "../..", ".env.local"),
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        logger.debug(`Loaded environment from: ${envPath}`);
      }
    }

    // Step 1: Validate environment
    logger.info("🚀 Starting ElizaOS deployment...");

    const dirInfo = detectDirectoryType(cwd);

    if (!dirInfo.hasPackageJson) {
      return {
        success: false,
        error: "Not in a valid project directory. No package.json found.",
      };
    }

    // Step 2: Get API credentials
    const credentials = getApiCredentials();
    if (!credentials && !options.apiKey) {
      return {
        success: false,
        error:
          "No API key found. Set ELIZAOS_API_KEY environment variable or use --api-key flag.",
      };
    }

    const apiClient = new CloudApiClient({
      apiKey: options.apiKey || credentials!.apiKey,
      apiUrl: options.apiUrl || credentials!.apiUrl,
    });

    // Step 3: Determine project name
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf-8"),
    );
    const projectName =
      options.name || packageJson.name || path.basename(cwd);

    logger.info(`📦 Deploying project: ${projectName}`);

    // Step 4: Check Docker
    if (!(await checkDockerAvailable())) {
      return {
        success: false,
        error:
          "Docker is not installed or not running. Please install Docker and try again.",
      };
    }

    // Step 5: Ensure Dockerfile exists
    let dockerfilePath = options.dockerfile || "Dockerfile";
    const fullDockerfilePath = path.join(cwd, dockerfilePath);

    if (!fs.existsSync(fullDockerfilePath)) {
      logger.warn("No Dockerfile found. Generating default Dockerfile...");
      dockerfilePath = generateDefaultDockerfile(cwd);
    }

    // Step 6: Build Docker image
    if (options.build !== false) {
      logger.info("🔨 Building Docker image...");

      // Sanitize project name for Docker tag
      // Remove @ prefix and scope, replace invalid chars with hyphens, remove leading/trailing hyphens
      const sanitizedName = projectName
        .toLowerCase()
        .replace(/^@/, "")           // Remove leading @
        .replace(/\//g, "-")          // Replace / with -
        .replace(/[^a-z0-9-]/g, "-")  // Replace other invalid chars with -
        .replace(/^-+|-+$/g, "")      // Remove leading/trailing hyphens
        .replace(/-+/g, "-");         // Replace multiple consecutive hyphens with single hyphen

      const imageTag =
        options.tag ||
        `elizaos/${sanitizedName}:latest`;

      const buildResult = await buildDockerImage({
        dockerfile: dockerfilePath,
        tag: imageTag,
        context: cwd,
        platform: "linux/amd64", // Cloudflare uses amd64
      });

      if (!buildResult.success) {
        return {
          success: false,
          error: `Docker build failed: ${buildResult.error}`,
        };
      }

      logger.info(`✅ Docker image built: ${imageTag}`);
    }

    // Step 7: Parse environment variables
    const environmentVars: Record<string, string> = {};
    if (options.env) {
      for (const envPair of options.env) {
        const [key, ...valueParts] = envPair.split("=");
        if (key && valueParts.length > 0) {
          environmentVars[key] = valueParts.join("=");
        }
      }
    }

    // Step 8: Create deployment configuration
    const containerConfig: ContainerConfig = {
      name: projectName,
      description: packageJson.description || `ElizaOS project: ${projectName}`,
      image_tag: options.tag || "latest",
      dockerfile_path: dockerfilePath,
      port: options.port || 3000,
      max_instances: options.maxInstances || 1,
      environment_vars: environmentVars,
      health_check_path: "/health",
    };

    // Step 9: Create container deployment
    logger.info("☁️  Deploying to Cloudflare Containers...");

    const createResponse = await apiClient.createContainer(containerConfig);

    if (!createResponse.success || !createResponse.data) {
      return {
        success: false,
        error: createResponse.error || "Failed to create container",
      };
    }

    const containerId = createResponse.data.id;
    logger.info(`✅ Container created: ${containerId}`);

    // Step 10: Wait for deployment to complete
    logger.info("⏳ Waiting for deployment to complete...");

    const deploymentResponse = await apiClient.waitForDeployment(containerId, {
      maxAttempts: 60,
      intervalMs: 5000,
    });

    if (!deploymentResponse.success) {
      return {
        success: false,
        containerId,
        error: deploymentResponse.error || "Deployment failed",
      };
    }

    const container = deploymentResponse.data;

    // Step 11: Success!
    logger.info("✅ Deployment successful!");
    logger.info(`📍 Container ID: ${container.id}`);

    if (container.cloudflare_worker_id) {
      logger.info(`🌐 Worker ID: ${container.cloudflare_worker_id}`);
    }

    return {
      success: true,
      containerId: container.id,
      workerId: container.cloudflare_worker_id,
      url: `https://${projectName.toLowerCase()}.workers.dev`, // This would come from the actual deployment
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Deployment error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

