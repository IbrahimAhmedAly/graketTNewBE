import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/utils/auth/password.utility';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('Seeding permissions...');

  const permissions = [
    // Category permissions
    {
      name: 'category.create',
      description: 'Create categories',
      module: 'category',
    },
    {
      name: 'category.read',
      description: 'View categories',
      module: 'category',
    },
    {
      name: 'category.update',
      description: 'Update categories',
      module: 'category',
    },
    {
      name: 'category.delete',
      description: 'Delete categories',
      module: 'category',
    },

    // Event permissions
    { name: 'event.create', description: 'Create events', module: 'event' },
    { name: 'event.read', description: 'View events', module: 'event' },
    { name: 'event.update', description: 'Update events', module: 'event' },
    { name: 'event.delete', description: 'Delete events', module: 'event' },

    // Event Request permissions
    {
      name: 'event-request.read',
      description: 'View event requests',
      module: 'event-request',
    },
    {
      name: 'event-request.update',
      description: 'Update event requests',
      module: 'event-request',
    },
    {
      name: 'event-request.delete',
      description: 'Delete event requests',
      module: 'event-request',
    },

    // CMS permissions
    { name: 'cms.create', description: 'Create CMS content', module: 'cms' },
    { name: 'cms.read', description: 'View CMS content', module: 'cms' },
    { name: 'cms.update', description: 'Update CMS content', module: 'cms' },
    { name: 'cms.delete', description: 'Delete CMS content', module: 'cms' },

    // User permissions
    { name: 'user.create', description: 'Create users', module: 'user' },
    { name: 'user.read', description: 'View users', module: 'user' },
    { name: 'user.update', description: 'Update users', module: 'user' },
    { name: 'user.delete', description: 'Delete users', module: 'user' },

    // Role permissions
    { name: 'role.create', description: 'Create roles', module: 'role' },
    { name: 'role.read', description: 'View roles', module: 'role' },
    { name: 'role.update', description: 'Update roles', module: 'role' },
    { name: 'role.delete', description: 'Delete roles', module: 'role' },

    // Banner permissions
    { name: 'banner.create', description: 'Create banners', module: 'banner' },
    { name: 'banner.read', description: 'View banners', module: 'banner' },
    { name: 'banner.update', description: 'Update banners', module: 'banner' },
    { name: 'banner.delete', description: 'Delete banners', module: 'banner' },

    // Contact permissions
    {
      name: 'contact.read',
      description: 'View contact info',
      module: 'contact',
    },
    {
      name: 'contact.update',
      description: 'Update contact info',
      module: 'contact',
    },

    // Language permissions
    {
      name: 'language.create',
      description: 'Create languages',
      module: 'language',
    },
    {
      name: 'language.read',
      description: 'View languages',
      module: 'language',
    },
    {
      name: 'language.update',
      description: 'Update languages',
      module: 'language',
    },
    {
      name: 'language.delete',
      description: 'Delete languages',
      module: 'language',
    },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  console.log(`✅ ${permissions.length} permissions created`);
}

async function seedRoles() {
  console.log('Seeding roles...');

  // Get all permissions
  const allPermissions = await prisma.permission.findMany();

  // Super Admin - Full access
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full system access',
      isActive: true,
    },
  });

  // Assign all permissions to Super Admin
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Event Manager - Manage events, categories, event requests
  const eventManagerRole = await prisma.role.upsert({
    where: { name: 'Event Manager' },
    update: {},
    create: {
      name: 'Event Manager',
      description: 'Manage events and categories',
      isActive: true,
    },
  });

  const eventManagerPermissions = allPermissions.filter((p) =>
    ['category', 'event', 'event-request', 'banner'].includes(p.module),
  );

  for (const permission of eventManagerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: eventManagerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: eventManagerRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Content Manager - Manage CMS, banners, contact info
  const contentManagerRole = await prisma.role.upsert({
    where: { name: 'Content Manager' },
    update: {},
    create: {
      name: 'Content Manager',
      description: 'Manage website content',
      isActive: true,
    },
  });

  const contentManagerPermissions = allPermissions.filter((p) =>
    ['cms', 'banner', 'contact', 'category', 'language'].includes(p.module),
  );

  for (const permission of contentManagerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: contentManagerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: contentManagerRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Support - Read-only access + manage event requests
  const supportRole = await prisma.role.upsert({
    where: { name: 'Support' },
    update: {},
    create: {
      name: 'Support',
      description: 'Customer support and event request management',
      isActive: true,
    },
  });

  const supportPermissions = allPermissions.filter(
    (p) => p.name.endsWith('.read') || p.module === 'event-request',
  );

  for (const permission of supportPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: supportRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: supportRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(
    '✅ Roles created: Super Admin, Event Manager, Content Manager, Support',
  );
}

async function seedUser() {
  console.log('Seeding admin user...');

  const hashedPassword = await hashPassword('Admin@123');

  await prisma.user.deleteMany({
    where: { email: 'admin@mergaz.com' },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mergaz.com',
      name: 'Admin',
      password: hashedPassword,
    },
  });

  // Assign Super Admin role
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'Super Admin' },
  });

  if (superAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    });
    console.log(
      `✅ Admin user created: ${adminUser.email} with Super Admin role`,
    );
  }
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedUser();
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
