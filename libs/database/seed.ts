import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { auth } from "@libs/auth";
import { db } from "./client";
import { user, account, blogPost } from "./schema";
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
