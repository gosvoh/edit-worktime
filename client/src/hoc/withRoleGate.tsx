import { createElement, type ComponentType } from "react";
import type { UserRole } from "../types";

type RoleGateProps = {
  isOpen: boolean;
  currentRole: UserRole;
};

export function withRoleGate<P extends object>(
  WrappedComponent: ComponentType<P>,
  allowedRoles: UserRole[]
) {
  return function RoleGatedComponent(props: P & RoleGateProps) {
    const { isOpen, currentRole, ...rest } = props;

    if (!isOpen) {
      return null;
    }

    if (!allowedRoles.includes(currentRole)) {
      return null;
    }

    return createElement(WrappedComponent, rest as P);
  };
}
