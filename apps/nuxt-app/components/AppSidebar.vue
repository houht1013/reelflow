<template>
  <Sidebar>
    <SidebarHeader class="p-4 border-b border-sidebar-border">
      <NuxtLink :to="localePath('/')">
        <AppLogo size="md" />
      </NuxtLink>
    </SidebarHeader>
    
    <SidebarContent>
      <!-- Dashboard Section -->
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isRouteActive('/admin') && route.path === localePath('/admin')">
                <NuxtLink :to="localePath('/admin')">
                  <LayoutDashboard />
                  <span>{{ t('navigation.admin.dashboard') }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <!-- Main Menu Section -->
      <SidebarGroup>
        <SidebarGroupLabel>{{ t('navigation.admin.application') }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isRouteActive('/admin/users')">
                <NuxtLink :to="localePath('/admin/users')">
                  <User />
                  <span>{{ t('navigation.admin.users') }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isRouteActive('/admin/subscriptions')">
                <NuxtLink :to="localePath('/admin/subscriptions')">
                  <CreditCard />
                  <span>{{ t('navigation.admin.subscriptions') }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isRouteActive('/admin/orders')">
                <NuxtLink :to="localePath('/admin/orders')">
                  <ShoppingCart />
                  <span>{{ t('navigation.admin.orders') }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isRouteActive('/admin/credits')">
                <NuxtLink :to="localePath('/admin/credits')">
                  <Coins />
                  <span>{{ t('navigation.admin.credits') }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isRouteActive('/admin/blog')">
                <NuxtLink :to="localePath('/admin/blog')">
                  <FileText />
                  <span>{{ t('navigation.admin.blog') }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</template>

<script setup lang="ts">
import { User, CreditCard, ShoppingCart, LayoutDashboard, Coins, FileText } from 'lucide-vue-next'

// Internationalization
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

// Check if a route is active
const isRouteActive = (path: string) => {
  return route.path.startsWith(localePath(path))
}
</script> 