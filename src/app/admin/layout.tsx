import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

const Layout = ({ children }: React.PropsWithChildren) => (
  <AntdRegistry>{children}</AntdRegistry>
);

export default Layout;
