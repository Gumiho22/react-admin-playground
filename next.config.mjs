/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    /**
     * 按需引入说明：
     * 1) ECharts：核心手段是 `echarts/core` + echarts.use([...]) 显式注册（见 src/lib/echarts.ts），
     *    这里再加上 barrel 优化作为兜底，避免任何人从 'echarts' 根入口整包引入。
     * 2) antd / @ant-design/icons：**故意不放进 optimizePackageImports**。
     *    antd v5 的 es 产物本身支持 tree-shaking（每个组件独立文件 + "use client"），
     *    而开启 barrel 优化后，在 Server Component 里使用 Typography.Title 这类复合组件
     *    会命中 Next 的已知问题：
     *    "Could not find the module ...__barrel_optimize__...#Typography#Title in the React Client Manifest"。
     */
    optimizePackageImports: ['echarts'],
  },
};

export default nextConfig;
