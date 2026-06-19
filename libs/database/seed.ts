import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { auth } from "@libs/auth";
import { MVP_PRICING_SEEDS } from "@libs/reelflow/pricing";
import { MVP_PROVIDER_PROFILE_SEEDS } from "@libs/reelflow/providers";
import { MVP_TEMPLATE_SEEDS } from "@libs/reelflow/templates";
import { db } from "./client";
import {
  account,
  blogPost,
  creditAccount,
  pricingItem,
  providerProfile,
  retentionPolicy,
  template,
  user,
  workspace,
  workspaceMember,
} from "./schema";
import { eq } from "drizzle-orm/expressions";
import { getDialect } from "./shared/dialect";

/**
 * 生成用户ID
 */
function generateUserId(): string {
  return `user_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 生成账户ID
 */
function generateAccountId(): string {
  return `account_${Math.random().toString(36).substring(2, 15)}`;
}

async function ensureDefaultWorkspace(owner: { id: string; name?: string | null; email: string }) {
  const existingWorkspace = await db
    .select()
    .from(workspace)
    .where(eq(workspace.ownerUserId, owner.id))
    .limit(1);

  if (existingWorkspace.length > 0) {
    return existingWorkspace[0];
  }

  const workspaceId = crypto.randomUUID();
  await db.insert(workspace).values({
    id: workspaceId,
    name: owner.name ? `${owner.name}'s Workspace` : `${owner.email}'s Workspace`,
    ownerUserId: owner.id,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(workspaceMember).values({
    id: crypto.randomUUID(),
    workspaceId,
    userId: owner.id,
    role: "owner",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(creditAccount).values({
    id: crypto.randomUUID(),
    workspaceId,
    balance: "100",
    frozenBalance: "0",
    debtBalance: "0",
    totalGranted: "100",
    totalConsumed: "0",
    updatedAt: new Date(),
  });

  return (await db.select().from(workspace).where(eq(workspace.id, workspaceId)).limit(1))[0];
}

async function seedReelflowDefaults() {
  console.log("创建 Reelflow 默认 workspace...");
  const seededUsers = await db.select().from(user);
  for (const seededUser of seededUsers) {
    await ensureDefaultWorkspace(seededUser);
  }
  console.log(`✓ 已确保 ${seededUsers.length} 个用户拥有默认 workspace`);

  console.log("创建 Reelflow MVP 模板...");
  for (const seed of MVP_TEMPLATE_SEEDS) {
    const existing = await db.select({ id: template.id }).from(template).where(eq(template.code, seed.code)).limit(1);
    if (existing.length > 0) {
      await db
        .update(template)
        .set({
          name: seed.name,
          description: seed.description,
          category: seed.category,
          recommended: seed.recommended,
          featuredOrder: seed.featuredOrder,
          builderVersion: seed.builderVersion,
          inputSchema: seed.inputSchema,
          capabilityRequirements: seed.capabilityRequirements,
          updatedAt: new Date(),
        })
        .where(eq(template.id, existing[0].id));
      continue;
    }

    await db.insert(template).values({
      id: crypto.randomUUID(),
      code: seed.code,
      name: seed.name,
      description: seed.description,
      category: seed.category,
      visibility: "public",
      status: "published",
      recommended: seed.recommended,
      featuredOrder: seed.featuredOrder,
      builderVersion: seed.builderVersion,
      inputSchema: seed.inputSchema,
      capabilityRequirements: seed.capabilityRequirements,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log("✓ 已确保 Reelflow MVP 模板存在");

  console.log("创建 Reelflow 价格清单...");
  for (const seed of MVP_PRICING_SEEDS) {
    const existing = await db
      .select({ id: pricingItem.id })
      .from(pricingItem)
      .where(eq(pricingItem.id, `${seed.resourceType}:${seed.provider}:${seed.model ?? "default"}:${seed.usageUnit}`))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(pricingItem).values({
      id: `${seed.resourceType}:${seed.provider}:${seed.model ?? "default"}:${seed.usageUnit}`,
      resourceType: seed.resourceType,
      provider: seed.provider,
      model: seed.model,
      usageUnit: seed.usageUnit,
      providerCostUnitPrice: seed.providerCostUnitPrice,
      providerCostCurrency: seed.providerCostCurrency,
      creditUnitPrice: seed.creditUnitPrice,
      minCreditCost: seed.minCreditCost,
      enabled: true,
      updatedAt: new Date(),
    });
  }
  console.log("✓ 已确保 Reelflow 价格清单存在");

  console.log("创建 Reelflow Provider Profile...");
  for (const seed of MVP_PROVIDER_PROFILE_SEEDS) {
    const id = `${seed.providerType}:${seed.provider}`;
    const existing = await db.select({ id: providerProfile.id }).from(providerProfile).where(eq(providerProfile.id, id)).limit(1);
    if (existing.length > 0) continue;

    await db.insert(providerProfile).values({
      id,
      providerType: seed.providerType,
      provider: seed.provider,
      displayName: seed.displayName,
      enabled: seed.enabled,
      priority: seed.priority,
      config: seed.config,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log("✓ 已确保 Reelflow Provider Profile 存在");

  console.log("创建 Reelflow 默认保留策略...");
  const retentionSeeds = [
    { id: "default:draft_package", targetType: "draft_package", retentionDays: 30 },
    { id: "default:rendered_mp4", targetType: "rendered_mp4", retentionDays: 30 },
    { id: "default:asset", targetType: "asset", retentionDays: 90 },
    { id: "default:job_event", targetType: "job_event", retentionDays: 30 },
  ];

  for (const seed of retentionSeeds) {
    const existing = await db.select({ id: retentionPolicy.id }).from(retentionPolicy).where(eq(retentionPolicy.id, seed.id)).limit(1);
    if (existing.length > 0) continue;

    await db.insert(retentionPolicy).values({
      id: seed.id,
      targetType: seed.targetType,
      scope: "default",
      retentionDays: seed.retentionDays,
      enabled: true,
      updatedAt: new Date(),
    });
  }
  console.log("✓ 已确保 Reelflow 默认保留策略存在");
}

/**
 * 填充测试数据
 */
async function seedDatabase() {
  const dialect = getDialect();
  try {
    console.log(`⚙️ 开始填充测试数据... (dialect: ${dialect})`);
    
    // 获取 Better Auth 上下文以使用密码哈希功能
    const ctx = await auth.$context;
    
    // 创建管理员用户
    console.log("创建管理员用户...");
    try {
      // 检查管理员是否已存在
      const existingAdmin = await db.select().from(user).where(eq(user.email, "admin@example.com")).limit(1);
      
      if (existingAdmin.length > 0) {
        console.log("✓ 管理员用户已存在: admin@example.com");
      } else {
        // 生成密码哈希
        const adminPasswordHash = await ctx.password.hash("admin123");
        const adminUserId = generateUserId();
        
        // 插入管理员用户
        await db.insert(user).values({
          id: adminUserId,
          email: "admin@example.com",
          name: "管理员",
          emailVerified: true,
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // 插入密码账户记录
        await db.insert(account).values({
          id: generateAccountId(),
          accountId: generateAccountId(),
          providerId: "credential",
          userId: adminUserId,
          password: adminPasswordHash,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log("✓ 已创建管理员用户: admin@example.com");
      }
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint") || error.code === "23505") {
        console.log("✓ 管理员用户已存在: admin@example.com");
      } else {
        console.error("❌ 创建管理员失败:", error.message || error);
        return false;
      }
    }

    // 创建普通用户
    console.log("创建普通用户...");
    try {
      // 检查普通用户是否已存在
      const existingUser = await db.select().from(user).where(eq(user.email, "user@example.com")).limit(1);
      
      if (existingUser.length > 0) {
        console.log("✓ 普通用户已存在: user@example.com");
      } else {
        // 生成密码哈希
        const userPasswordHash = await ctx.password.hash("user123456");
        const normalUserId = generateUserId();
        
        // 插入普通用户
        await db.insert(user).values({
          id: normalUserId,
          email: "user@example.com",
          name: "测试用户",
          emailVerified: true,
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // 插入密码账户记录
        await db.insert(account).values({
          id: generateAccountId(),
          accountId: generateAccountId(),
          providerId: "credential",
          userId: normalUserId,
          password: userPasswordHash,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log("✓ 已创建普通用户: user@example.com");
      }
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint") || error.code === "23505") {
        console.log("✓ 普通用户已存在: user@example.com");
      } else {
        console.error("❌ 创建普通用户失败:", error.message || error);
        return false;
      }
    }
    
    // 创建博客文章
    console.log("创建博客文章...");
    try {
      const adminUser = await db.select().from(user).where(eq(user.email, "admin@example.com")).limit(1);
      if (adminUser.length > 0) {
        const adminId = adminUser[0].id;
        const existingPosts = await db.select({ id: blogPost.id }).from(blogPost).limit(1);

        if (existingPosts.length > 0) {
          console.log("✓ 博客文章已存在，跳过创建");
        } else {
          await db.insert(blogPost).values([
            {
              id: crypto.randomUUID(),
              title: "Getting Started with TinyShip",
              slug: "getting-started-with-tinyship",
              content: "# Getting Started\n\nWelcome to **TinyShip**! This is a modern SaaS starter kit.\n\n## Features\n\n- Next.js & Nuxt.js support\n- Authentication\n- Payment integration\n\n```javascript\nconsole.log(\"Hello TinyShip!\");\n```\n\nEnjoy building your SaaS!",
              coverImage: "https://static.vikingz.me/uploads/m7i5mVxdOw0oP8Y6iIPfpGgHJK5i1VVd/1773209769094-z7o70l.png",
              excerpt: "Learn how to get started with TinyShip, the modern SaaS development platform.",
              authorId: adminId,
              status: "published",
              publishedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: "Draft Post - Coming Soon",
              slug: "draft-post-coming-soon",
              content: "# Coming Soon\n\nThis post is still being written.",
              excerpt: "This is a draft post that should not appear on the public blog.",
              authorId: adminId,
              status: "draft",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]);
          console.log("✓ 已创建示例博客文章（1 篇已发布，1 篇草稿）");
        }
      } else {
        console.log("⚠ 未找到管理员用户，跳过博客文章创建");
      }
    } catch (error: any) {
      if (error.code === "23505" || error.message?.includes("UNIQUE constraint")) {
        console.log("✓ 博客文章已存在，跳过创建");
      } else {
        console.error("❌ 创建博客文章失败:", error.message || error);
      }
    }

    await seedReelflowDefaults();

    console.log("\n✅ 数据填充完成!");
    console.log("测试账户信息:");
    console.log("管理员 - 邮箱: admin@example.com, 密码: admin123");
    console.log("普通用户 - 邮箱: user@example.com, 密码: user123456");
    
    return true;
  } catch (error) {
    console.error("❌ 数据填充过程中发生错误:", error);
    return false;
  }
}

// 如果直接运行此文件，执行数据填充
if (require.main === module) {
  seedDatabase()
    .then((success) => {
      if (!success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("发生错误:", error);
      process.exit(1);
    });
}

export { seedDatabase };
