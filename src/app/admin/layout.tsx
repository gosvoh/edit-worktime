import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import ruRU from "antd/lib/locale/ru_RU";
import "./globals.css";
import { ConfigProvider } from "antd";

const Layout = ({ children }: React.PropsWithChildren) => (
  <AntdRegistry>
    <ConfigProvider locale={ruRU}>{children}</ConfigProvider>
  </AntdRegistry>
);

export default Layout;
