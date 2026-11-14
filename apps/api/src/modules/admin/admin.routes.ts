import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@tron-gas-sponsor/database";
import { getEnv } from "../../config/index.js";
import { requireAdminRole, requireAuth } from "../../plugins/auth.js";
import { getDashboardStats } from "../../services/dashboard.service.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../../services/settings.service.js";
import {
  createMasterWallet,
  deleteOrDisableMasterWallet,
  listMasterWallets,
  updateMasterWallet,
} from "../../services/master-wallet.service.js";
import {
  addToBlacklist,
  deactivateBlacklistEntry,
  listBlacklist,
  updateBlacklistEntry,
} from "../../services/blacklist.service.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
  status: z.string().optional(),
});

const settingsPatchSchema = z.object({
  minimumQualifyingTrx: z.string().optional(),
  energyTarget: z.number().int().positive().optional(),
  bandwidthTarget: z.number().int().positive().optional(),
  sponsorshipExpiryHours: z.number().int().positive().optional(),
  confirmationsRequired: z.number().int().positive().optional(),
  providerName: z.string().optional(),
  masterWalletAddress: z.string().optional(),
  monitorIntervalMs: z.number().int().positive().optional(),
  dailyProviderLimitTrx: z.string().optional(),
  monthlyProviderLimitTrx: z.string().optional(),
  maxActiveSponsorships: z.number().int().positive().optional(),
  maxCreditsPerWalletPerDay: z.number().int().positive().optional(),
  maxSponsorshipsPerIpPerDay: z.number().int().positive().optional(),
  maxGlobalSponsorshipsPerDay: z.number().int().positive().optional(),
  providerOrderMaxRetries: z.number().int().positive().optional(),
  providerTerm: z.enum(["15m", "1h"]).optional(),
  confirmDangerous: z.boolean().optional(),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
  });

  app.get("/admin/dashboard", async () => {
    const stats = await getDashboardStats();
    const env = getEnv();
    return {
      stats,
      network: env.TRON_NETWORK,
      appEnv: env.APP_ENV,
      note: "Master-wallet TRX → confirmation → fixed GetGas Energy+Bandwidth package",
    };
  });

  app.get("/admin/wallets", async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query", details: parsed.error.flatten() });
    }
    const { page, pageSize, q } = parsed.data;
    const where = q
      ? { address: { contains: q, mode: "insensitive" as const } }
      : {};
    const [data, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              deposits: true,
              sponsorshipCredits: true,
            },
          },
        },
      }),
      prisma.wallet.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  });

  app.get("/admin/wallets/:address", async (request, reply) => {
    const { address } = request.params as { address: string };
    const wallet = await prisma.wallet.findFirst({
      where: { address },
      include: {
        deposits: { orderBy: { detectedAt: "desc" }, take: 50 },
        sponsorshipCredits: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { providerOrders: true, deposit: true },
        },
      },
    });
    if (!wallet) {
      return reply.status(404).send({ error: "Wallet not found" });
    }
    return { wallet };
  });

  app.get("/admin/deposits", async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }
    const { page, pageSize, status, q } = parsed.data;
    const where = {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { txid: { contains: q, mode: "insensitive" as const } },
              { fromAddress: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      prisma.tRXDeposit.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          wallet: true,
          credit: true,
          masterWallet: {
            select: { id: true, address: true, label: true, network: true },
          },
        },
      }),
      prisma.tRXDeposit.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  });

  app.get("/admin/master-wallets", async () => {
    const data = await listMasterWallets();
    return { data };
  });

  app.post("/admin/master-wallets", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const bodySchema = z.object({
      address: z.string().min(26).max(64),
      label: z.string().max(120).optional(),
      network: z.enum(["mainnet", "shasta", "nile"]),
      enabled: z.boolean().optional(),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }
    try {
      const wallet = await createMasterWallet(parsed.data);
      await prisma.auditLog.create({
        data: {
          adminId: request.admin?.sub,
          action: "MASTER_WALLET_CREATED",
          entityType: "MasterWallet",
          entityId: wallet.id,
          metadata: { address: wallet.address },
        },
      });
      return reply.status(201).send({ wallet });
    } catch (err) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 500;
      return reply.status(status).send({
        error: err instanceof Error ? err.message : "Create failed",
      });
    }
  });

  app.patch("/admin/master-wallets/:id", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      label: z.string().max(120).optional(),
      enabled: z.boolean().optional(),
      network: z.enum(["mainnet", "shasta", "nile"]).optional(),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body" });
    }
    try {
      const wallet = await updateMasterWallet(id, parsed.data);
      await prisma.auditLog.create({
        data: {
          adminId: request.admin?.sub,
          action: "MASTER_WALLET_UPDATED",
          entityType: "MasterWallet",
          entityId: wallet.id,
          metadata: parsed.data,
        },
      });
      return { wallet };
    } catch (err) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 500;
      return reply.status(status).send({
        error: err instanceof Error ? err.message : "Update failed",
      });
    }
  });

  app.delete("/admin/master-wallets/:id", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const { id } = request.params as { id: string };
    try {
      const result = await deleteOrDisableMasterWallet(id);
      await prisma.auditLog.create({
        data: {
          adminId: request.admin?.sub,
          action: result.deleted
            ? "MASTER_WALLET_DELETED"
            : "MASTER_WALLET_DISABLED",
          entityType: "MasterWallet",
          entityId: id,
          metadata: {
            deleted: result.deleted,
            disabled: result.disabled,
            depositCount: result.wallet._count?.deposits ?? 0,
          },
        },
      });
      if (result.disabled && !result.deleted) {
        return {
          wallet: result.wallet,
          message:
            "Wallet has historical deposits and was disabled instead of deleted.",
        };
      }
      return reply.status(200).send({
        deleted: true,
        wallet: result.wallet,
      });
    } catch (err) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 500;
      return reply.status(status).send({
        error: err instanceof Error ? err.message : "Delete failed",
      });
    }
  });

  app.get("/admin/blacklist", async (request, reply) => {
    const querySchema = z.object({
      q: z.string().optional(),
      active: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true")),
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }
    const data = await listBlacklist(parsed.data);
    return { data };
  });

  app.post("/admin/blacklist", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const bodySchema = z.object({
      address: z.string().min(26).max(64),
      reason: z.string().min(1).max(500),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }
    try {
      const entry = await addToBlacklist({
        ...parsed.data,
        adminId: request.admin?.sub,
      });
      await prisma.auditLog.create({
        data: {
          adminId: request.admin?.sub,
          action: "BLACKLIST_ADDED",
          entityType: "BlacklistedWallet",
          entityId: entry.id,
          metadata: { address: entry.address, reason: entry.reason },
        },
      });
      return reply.status(201).send({ entry });
    } catch (err) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 500;
      return reply.status(status).send({
        error: err instanceof Error ? err.message : "Create failed",
      });
    }
  });

  app.patch("/admin/blacklist/:id", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      reason: z.string().min(1).max(500).optional(),
      active: z.boolean().optional(),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body" });
    }
    try {
      const entry = await updateBlacklistEntry(id, {
        ...parsed.data,
        adminId: request.admin?.sub,
      });
      await prisma.auditLog.create({
        data: {
          adminId: request.admin?.sub,
          action: "BLACKLIST_UPDATED",
          entityType: "BlacklistedWallet",
          entityId: entry.id,
          metadata: parsed.data,
        },
      });
      return { entry };
    } catch (err) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 500;
      return reply.status(status).send({
        error: err instanceof Error ? err.message : "Update failed",
      });
    }
  });

  app.delete("/admin/blacklist/:id", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const { id } = request.params as { id: string };
    try {
      const entry = await deactivateBlacklistEntry(id, request.admin?.sub);
      await prisma.auditLog.create({
        data: {
          adminId: request.admin?.sub,
          action: "BLACKLIST_DEACTIVATED",
          entityType: "BlacklistedWallet",
          entityId: entry.id,
          metadata: { address: entry.address },
        },
      });
      return {
        entry,
        message: "Blacklist entry deactivated. Historical blocked deposits remain blocked.",
      };
    } catch (err) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 500;
      return reply.status(status).send({
        error: err instanceof Error ? err.message : "Delete failed",
      });
    }
  });

  app.get("/admin/sponsorships", async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }
    const { page, pageSize, status, q } = parsed.data;
    const where = {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            wallet: {
              address: { contains: q, mode: "insensitive" as const },
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.sponsorshipCredit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          wallet: true,
          deposit: true,
          providerOrders: true,
        },
      }),
      prisma.sponsorshipCredit.count({ where }),
    ]);

    type OrderRow = {
      resourceType: string;
      deliveredAmount: { toString(): string } | null;
      provider: string;
      providerCostTrx: { toString(): string } | number | null;
    };
    type CreditRow = {
      id: string;
      status: string;
      energyTarget: number;
      bandwidthTarget: number;
      createdAt: Date;
      usedAt: Date | null;
      activatedAt: Date | null;
      wallet: { address: string };
      deposit: { txid: string; amountTrx: { toString(): string } };
      providerOrders: OrderRow[];
    };

    const data = (rows as CreditRow[]).map((row) => {
      const energy = row.providerOrders.find((o) => o.resourceType === "ENERGY");
      const bandwidth = row.providerOrders.find(
        (o) => o.resourceType === "BANDWIDTH",
      );
      const cost = row.providerOrders.reduce((sum: number, o) => {
        return sum + Number(o.providerCostTrx ?? 0);
      }, 0);

      return {
        id: row.id,
        walletAddress: row.wallet.address,
        depositTxid: row.deposit.txid,
        depositAmountTrx: row.deposit.amountTrx.toString(),
        status: row.status,
        energyTarget: row.energyTarget,
        bandwidthTarget: row.bandwidthTarget,
        energyDelivered: energy?.deliveredAmount?.toString() ?? null,
        bandwidthDelivered: bandwidth?.deliveredAmount?.toString() ?? null,
        provider: energy?.provider ?? bandwidth?.provider ?? null,
        providerCostTrx: cost ? String(cost) : null,
        createdAt: row.createdAt.toISOString(),
        usedAt: row.usedAt?.toISOString() ?? null,
        activatedAt: row.activatedAt?.toISOString() ?? null,
      };
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  });

  app.get("/admin/sponsorships/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const credit = await prisma.sponsorshipCredit.findUnique({
      where: { id },
      include: {
        wallet: true,
        deposit: true,
        providerOrders: true,
      },
    });
    if (!credit) {
      return reply.status(404).send({ error: "Sponsorship not found" });
    }
    return { credit };
  });

  app.get("/admin/orders", async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }
    const { page, pageSize, status } = parsed.data;
    const where = status ? { status: status as never } : {};
    const [data, total] = await Promise.all([
      prisma.providerOrder.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { wallet: true, credit: true },
      }),
      prisma.providerOrder.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  });

  app.get("/admin/providers", async () => {
    const env = getEnv();
    const [total, successful, failed, pending, energy, bandwidth, cost] =
      await Promise.all([
        prisma.providerOrder.count(),
        prisma.providerOrder.count({ where: { status: "FILLED" } }),
        prisma.providerOrder.count({ where: { status: "FAILED" } }),
        prisma.providerOrder.count({
          where: { status: { in: ["PENDING", "SUBMITTED"] } },
        }),
        prisma.providerOrder.aggregate({
          _sum: { deliveredAmount: true },
          where: { resourceType: "ENERGY", status: "FILLED" },
        }),
        prisma.providerOrder.aggregate({
          _sum: { deliveredAmount: true },
          where: { resourceType: "BANDWIDTH", status: "FILLED" },
        }),
        prisma.providerOrder.aggregate({
          _sum: { providerCostTrx: true },
          where: { status: "FILLED" },
        }),
      ]);

    let balance: number | null = null;
    let lastError: string | null = null;
    let lastSuccessfulApiCall: string | null = null;
    if (env.GETGAS_API_KEY) {
      try {
        const { GetGasProvider } = await import(
          "../provider/getgas.service.js"
        );
        const provider = new GetGasProvider();
        const bal = await provider.getBalance();
        balance = bal.trx ?? null;
        lastSuccessfulApiCall = new Date().toISOString();
      } catch (err) {
        lastError = err instanceof Error ? err.message : "GetGas balance failed";
      }
    }

    return {
      provider: "getgas",
      apiConfigured: Boolean(env.GETGAS_API_KEY),
      apiKeyExposed: false,
      balance,
      note: "API key never returned. Balance is GetGas account TRX, not end-user wallet resources.",
      totals: {
        totalOrders: total,
        successfulOrders: successful,
        failedOrders: failed,
        pendingOrders: pending,
        totalEnergyBought: energy._sum.deliveredAmount?.toString() ?? "0",
        totalBandwidthBought: bandwidth._sum.deliveredAmount?.toString() ?? "0",
        totalCostTrx: cost._sum.providerCostTrx?.toString() ?? "0",
      },
      lastSuccessfulApiCall,
      lastError,
    };
  });

  app.get("/admin/analytics", async () => {
    const rows = await prisma.dailyAnalytics.findMany({
      orderBy: { date: "desc" },
      take: 30,
    });
    return {
      daily: rows,
      note: "Analytics aggregation worker arrives in Phase 5/6. Empty until workers run.",
    };
  });

  app.get("/admin/settings", async () => {
    const settings = await getSystemSettings();
    return { settings };
  });

  app.patch("/admin/settings", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const parsed = settingsPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid settings payload",
        details: parsed.error.flatten(),
      });
    }
    const { confirmDangerous, ...updates } = parsed.data;
    try {
      const settings = await updateSystemSettings(
        updates,
        request.admin!.sub,
        confirmDangerous ?? false,
      );
      return { settings };
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : "Settings update failed",
      });
    }
  });

  app.get("/admin/audit", async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }
    const { page, pageSize } = parsed.data;
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          admin: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count(),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  });

  /**
   * Wipe operational data (deposits, credits, orders, wallets, analytics, audit).
   * Keeps admin users, system settings, master wallets, and blacklist.
   */
  app.post("/admin/clear-data", async (request, reply) => {
    if (!requireAdminRole(request, reply, ["SUPER_ADMIN", "ADMIN"])) return;
    const body = z
      .object({
        confirm: z.literal("CLEAR_OPERATIONAL_DATA"),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'Send { "confirm": "CLEAR_OPERATIONAL_DATA" } to proceed',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const providerOrders = await tx.providerOrder.deleteMany();
      const credits = await tx.sponsorshipCredit.deleteMany();
      const deposits = await tx.tRXDeposit.deleteMany();
      const wallets = await tx.wallet.deleteMany();
      const analytics = await tx.dailyAnalytics.deleteMany();
      const audit = await tx.auditLog.deleteMany();
      const workers = await tx.workerState.deleteMany();
      return {
        providerOrders: providerOrders.count,
        sponsorshipCredits: credits.count,
        deposits: deposits.count,
        wallets: wallets.count,
        dailyAnalytics: analytics.count,
        auditLogs: audit.count,
        workerStates: workers.count,
      };
    });

    await prisma.auditLog.create({
      data: {
        adminId: request.admin!.sub,
        action: "CLEAR_OPERATIONAL_DATA",
        entityType: "system",
        metadata: result,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"]?.slice(0, 240),
      },
    });

    return {
      ok: true,
      cleared: result,
      kept: [
        "admin_users",
        "system_settings",
        "master_wallets",
        "blacklisted_wallets",
      ],
      note: "Operational history wiped. Master wallets and settings kept.",
    };
  });
};
