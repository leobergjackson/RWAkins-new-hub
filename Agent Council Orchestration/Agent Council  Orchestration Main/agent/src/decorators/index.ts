// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — NestJS-style decorator system for Express routes
//
// Provides a clean, metadata-driven controller pattern on top of Express.
// Decorators store route metadata on the class prototype; registerController()
// reads it at boot time and wires up the Express router automatically.

import { Router, type Request, type Response, type NextFunction } from 'express';

// ── Metadata keys (Symbol-based to avoid collisions) ────────────────

const META_BASE_PATH  = Symbol('controller:basePath');
const META_ROUTES     = Symbol('controller:routes');
const META_API_TAG    = Symbol('controller:apiTag');

// ── Types ───────────────────────────────────────────────────────────

interface RouteMeta {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handlerName: string;
  description?: string;
  guards: GuardFn[];
}

type GuardFn = (req: Request, res: Response, next: NextFunction) => void;

// ── Helper: ensure route metadata array exists ──────────────────────

function getRoutes(target: object): RouteMeta[] {
  const proto = target as Record<symbol, RouteMeta[]>;
  if (!proto[META_ROUTES]) {
    proto[META_ROUTES] = [];
  }
  return proto[META_ROUTES];
}

// ── Class Decorators ────────────────────────────────────────────────

/**
 * Marks a class as an Express controller with a base path.
 * All route methods inside will be prefixed with this path.
 *
 * @example
 * ＠Controller('/health')
 * class HealthController { ... }
 */
export function Controller(basePath: string): ClassDecorator {
  return function (target: Function) {
    (target.prototype as Record<symbol, string>)[META_BASE_PATH] = basePath;
  };
}

/**
 * Tags the controller for OpenAPI grouping.
 */
export function ApiTag(tag: string): ClassDecorator {
  return function (target: Function) {
    (target.prototype as Record<symbol, string>)[META_API_TAG] = tag;
  };
}

// ── Method Decorators ───────────────────────────────────────────────

function createMethodDecorator(method: RouteMeta['method']) {
  return function (path: string): MethodDecorator {
    return function (_target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
      const routes = getRoutes(_target);
      // Find existing entry (may have been created by ApiDescription first)
      const existing = routes.find(r => r.handlerName === String(propertyKey));
      if (existing) {
        existing.method = method;
        existing.path = path;
      } else {
        routes.push({
          method,
          path,
          handlerName: String(propertyKey),
          guards: [],
        });
      }
    };
  };
}

/** GET route */
export const Get    = createMethodDecorator('get');
/** POST route */
export const Post   = createMethodDecorator('post');
/** PUT route */
export const Put    = createMethodDecorator('put');
/** DELETE route */
export const Delete = createMethodDecorator('delete');
/** PATCH route */
export const Patch  = createMethodDecorator('patch');

/**
 * Adds a description to the route (used in OpenAPI docs and logging).
 */
export function ApiDescription(desc: string): MethodDecorator {
  return function (_target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
    const routes = getRoutes(_target);
    const existing = routes.find(r => r.handlerName === String(propertyKey));
    if (existing) {
      existing.description = desc;
    } else {
      routes.push({
        method: 'get',
        path: '/',
        handlerName: String(propertyKey),
        description: desc,
        guards: [],
      });
    }
  };
}

/**
 * Attaches a guard (middleware) to a specific route method.
 * Guards run before the handler and can short-circuit the request.
 */
export function UseGuard(guard: GuardFn): MethodDecorator {
  return function (_target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
    const routes = getRoutes(_target);
    const existing = routes.find(r => r.handlerName === String(propertyKey));
    if (existing) {
      existing.guards.push(guard);
    } else {
      routes.push({
        method: 'get',
        path: '/',
        handlerName: String(propertyKey),
        guards: [guard],
      });
    }
  };
}

// ── Registration ────────────────────────────────────────────────────

/**
 * Reads decorator metadata from a controller instance and registers
 * all discovered routes on the provided Express Router.
 *
 * @param router  Express Router to mount routes on
 * @param controller  Instantiated controller object (decorated class)
 * @returns Array of registered route descriptions (for logging/docs)
 */
export function registerController(
  router: Router,
  controller: object,
): Array<{ method: string; fullPath: string; description?: string }> {
  const proto = Object.getPrototypeOf(controller) as Record<symbol, unknown>;
  const basePath = (proto[META_BASE_PATH] as string) ?? '';
  const routes = (proto[META_ROUTES] as RouteMeta[]) ?? [];
  // Tag is available for OpenAPI integration if needed
  void (proto[META_API_TAG] as string);

  const registered: Array<{ method: string; fullPath: string; description?: string }> = [];

  for (const route of routes) {
    const fullPath = basePath + route.path;
    const handler = (controller as Record<string, Function>)[route.handlerName];

    if (typeof handler !== 'function') continue;

    // Build middleware chain: guards first, then the handler
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [
      ...route.guards,
    ];

    // Wrap handler to catch async errors
    const asyncHandler = (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(handler.call(controller, req, res, next)).catch(next);
    };

    router[route.method](fullPath, ...middlewares, asyncHandler);
    registered.push({ method: route.method.toUpperCase(), fullPath, description: route.description });
  }

  return registered;
}
