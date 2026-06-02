import {
  defaultClassicSceneRoleConfig,
  isClassicSceneRoleIcon,
  type ClassicSceneRoleIcon,
} from "@/data/classicSceneRoles";

type RoleAvatarSymbol =
  | "bank"
  | "bell"
  | "book"
  | "briefcase"
  | "cash"
  | "chat"
  | "cross"
  | "default"
  | "document"
  | "plane"
  | "shield"
  | "steering"
  | "store"
  | "tray"
  | "umbrella";

type RoleAvatarTemplate = {
  accent: string;
  background: string;
  hair: string;
  jacket: string;
  shirt: string;
  skin: string;
  symbol: RoleAvatarSymbol;
};

const roleAvatarTemplates = {
  "default-role": {
    accent: "#5f8f5d",
    background: "#f3eadc",
    hair: "#7a5a38",
    jacket: "#5d7f54",
    shirt: "#fffaf2",
    skin: "#ffe6cf",
    symbol: "default",
  },
  "bank-staff": {
    accent: "#4f7e4b",
    background: "#f3eadc",
    hair: "#7a5a38",
    jacket: "#5d7f54",
    shirt: "#fffaf2",
    skin: "#ffe6cf",
    symbol: "bank",
  },
  "government-staff": {
    accent: "#3f6c54",
    background: "#eef1e7",
    hair: "#4d3b2e",
    jacket: "#4f6f59",
    shirt: "#fffaf2",
    skin: "#f7d5bd",
    symbol: "document",
  },
  "insurance-agent": {
    accent: "#78639a",
    background: "#f1ecf4",
    hair: "#624637",
    jacket: "#6a5d88",
    shirt: "#fffaf2",
    skin: "#f7d5bd",
    symbol: "umbrella",
  },
  "restaurant-server": {
    accent: "#d6763c",
    background: "#fff0e5",
    hair: "#6f4b31",
    jacket: "#7c8b57",
    shirt: "#fffaf2",
    skin: "#ffe0c5",
    symbol: "tray",
  },
  "store-clerk": {
    accent: "#4e8b83",
    background: "#eaf5f3",
    hair: "#7a5a38",
    jacket: "#4e8b83",
    shirt: "#fffaf2",
    skin: "#ffe6cf",
    symbol: "store",
  },
  cashier: {
    accent: "#d99b24",
    background: "#fff7df",
    hair: "#5b4133",
    jacket: "#6f8c65",
    shirt: "#fffaf2",
    skin: "#f7d5bd",
    symbol: "cash",
  },
  doctor: {
    accent: "#4e8b83",
    background: "#edf7f6",
    hair: "#4d3b2e",
    jacket: "#f8fbfb",
    shirt: "#dff3f0",
    skin: "#ffe2c8",
    symbol: "cross",
  },
  nurse: {
    accent: "#d86d82",
    background: "#fff0f3",
    hair: "#5e4738",
    jacket: "#f8fbfb",
    shirt: "#fff7fa",
    skin: "#ffe2c8",
    symbol: "cross",
  },
  "front-desk": {
    accent: "#5f8f5d",
    background: "#eef5e8",
    hair: "#6f4b31",
    jacket: "#668f58",
    shirt: "#fffaf2",
    skin: "#f7d5bd",
    symbol: "bell",
  },
  "airport-staff": {
    accent: "#3f838b",
    background: "#eef7f4",
    hair: "#4d3b2e",
    jacket: "#456f88",
    shirt: "#fffaf2",
    skin: "#ffe0c5",
    symbol: "plane",
  },
  "hotel-front-desk": {
    accent: "#a27745",
    background: "#f7efe3",
    hair: "#6f4b31",
    jacket: "#6f8c65",
    shirt: "#fffaf2",
    skin: "#ffe2c8",
    symbol: "bell",
  },
  driver: {
    accent: "#3f838b",
    background: "#eef7f4",
    hair: "#5b4133",
    jacket: "#4c7780",
    shirt: "#fffaf2",
    skin: "#f7d5bd",
    symbol: "steering",
  },
  teacher: {
    accent: "#5f8f5d",
    background: "#eef5e8",
    hair: "#7a5a38",
    jacket: "#6f8c65",
    shirt: "#fffaf2",
    skin: "#ffe6cf",
    symbol: "book",
  },
  coworker: {
    accent: "#4e8b83",
    background: "#eef7f4",
    hair: "#624637",
    jacket: "#567c72",
    shirt: "#fffaf2",
    skin: "#f7d5bd",
    symbol: "chat",
  },
  manager: {
    accent: "#315f37",
    background: "#edf5e8",
    hair: "#4d3b2e",
    jacket: "#315f37",
    shirt: "#fffaf2",
    skin: "#ffe0c5",
    symbol: "briefcase",
  },
  hr: {
    accent: "#7b6794",
    background: "#f4eef5",
    hair: "#6f4b31",
    jacket: "#7b6794",
    shirt: "#fffaf2",
    skin: "#ffe2c8",
    symbol: "document",
  },
} satisfies Record<ClassicSceneRoleIcon, RoleAvatarTemplate>;

function RoleSymbol({
  color,
  symbol,
}: {
  color: string;
  symbol: RoleAvatarSymbol;
}) {
  if (symbol === "bank") {
    return (
      <>
        <path d="M47.2 48.4h12.4M48.8 44.8 53.4 42l4.6 2.8H48.8Z" />
        <path d="M50 45.5v4M53.4 45.5v4M56.8 45.5v4" />
      </>
    );
  }

  if (symbol === "bell") {
    return (
      <>
        <path d="M49 49.2h10.6M54.3 43.1c3 0 5.1 2.2 5.1 5H49.2c0-2.8 2.1-5 5.1-5Z" />
        <path d="M54.3 41.7v1.4" />
      </>
    );
  }

  if (symbol === "book") {
    return (
      <>
        <path d="M47.8 43.2h5.2c1.3 0 2.2.8 2.2 2.1v6.7c0-1.3-.9-2.1-2.2-2.1h-5.2V43.2Z" />
        <path d="M60 43.2h-5.2c-1.3 0-2.2.8-2.2 2.1v6.7c0-1.3.9-2.1 2.2-2.1H60V43.2Z" />
      </>
    );
  }

  if (symbol === "briefcase") {
    return (
      <>
        <rect x="48" y="45" width="12" height="8" rx="1.6" />
        <path d="M51.2 45v-2h5.6v2M48 48.5h12" />
      </>
    );
  }

  if (symbol === "cash") {
    return (
      <>
        <rect x="48" y="44" width="12" height="8" rx="1.6" />
        <path d="M50 48h8M54 45.4v5.2" />
      </>
    );
  }

  if (symbol === "chat") {
    return (
      <>
        <path d="M48.2 45.8c0-2.2 2-3.7 4.6-3.7s4.5 1.5 4.5 3.7-1.9 3.7-4.5 3.7c-.6 0-1.1-.1-1.6-.2l-2.4 1 .7-2a3.1 3.1 0 0 1-1.3-2.5Z" />
        <path d="M58.2 47.5c1.4.4 2.3 1.5 2.3 2.8 0 .7-.2 1.3-.7 1.8l.5 1.6-2-.8c-.5.2-1 .2-1.6.2-1.8 0-3.2-.7-4-1.8" />
      </>
    );
  }

  if (symbol === "cross") {
    return <path d="M52.2 42.8h5v4.2h4.2v5h-4.2v4.2h-5V52H48v-5h4.2v-4.2Z" />;
  }

  if (symbol === "document") {
    return (
      <>
        <path d="M49.2 42.5h7.8l2.4 2.5v10h-10.2V42.5Z" />
        <path d="M57 42.5v3h2.4M51.4 48.4h5.8M51.4 51.2h4.8" />
      </>
    );
  }

  if (symbol === "plane") {
    return <path d="M54.8 42.4 61 40.8l1 1.8-5.8 3.5v4.4l-1.8.9-2.3-4-4 1.3-1.1-1.7 4.8-3.2v-2.4l1.8-.7 1.2 1.7Z" />;
  }

  if (symbol === "shield") {
    return <path d="M54 41.5 60 44v4.3c0 4-2.4 6.7-6 8-3.6-1.3-6-4-6-8V44l6-2.5Z" />;
  }

  if (symbol === "steering") {
    return (
      <>
        <circle cx="54" cy="49" r="6.1" />
        <path d="M48 48.4h12M54 49v6M51.2 49.5l-3.6 2.7M56.8 49.5l3.6 2.7" />
      </>
    );
  }

  if (symbol === "store") {
    return (
      <>
        <path d="M48 45.5h12l-1 9H49l-1-9Z" />
        <path d="M50.6 45.5a3.5 3.5 0 0 1 6.8 0" />
      </>
    );
  }

  if (symbol === "tray") {
    return (
      <>
        <path d="M48.2 50.4h11.6M49.2 50.4c.4-3.4 2.3-5.4 4.8-5.4s4.4 2 4.8 5.4" />
        <path d="M54 43v2" />
      </>
    );
  }

  if (symbol === "umbrella") {
    return (
      <>
        <path d="M47.2 47.8c1.8-3.7 4.1-5.5 6.8-5.5s5 1.8 6.8 5.5H47.2Z" />
        <path d="M54 47.8v6.2c0 1.2 1.9 1.2 1.9 0" />
      </>
    );
  }

  return (
    <>
      <circle cx="54" cy="49" r="5.8" fill={color} stroke="none" />
      <path d="m54 45.6 1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3 1-2.1Z" stroke="#fffaf2" />
    </>
  );
}

export default function ClassicRoleAvatarIcon({
  roleIcon,
}: {
  roleIcon?: ClassicSceneRoleIcon | string | null;
}) {
  const resolvedRoleIcon = isClassicSceneRoleIcon(roleIcon)
    ? roleIcon
    : defaultClassicSceneRoleConfig.roleIcon;
  const template = roleAvatarTemplates[resolvedRoleIcon];

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="33" fill={template.background} />
      <path d="M20 61c3-11 9-17 16-17s13 6 16 17" fill={template.jacket} />
      <path
        d="M24 25c2-10 9-16 18-14 9 2 13 10 10 20-2-7-7-10-14-9-7 1-11 2-14 3Z"
        fill={template.hair}
      />
      <circle cx="35" cy="31" r="16" fill={template.skin} />
      <path
        d="M25 31c2-5 7-8 15-8 5 0 9 2 12 6-2-11-10-17-20-14-8 2-12 8-12 17 2 0 3 0 5-1Z"
        fill={template.hair}
      />
      <circle cx="30" cy="33" r="1.8" fill="#3d3025" />
      <circle cx="41" cy="33" r="1.8" fill="#3d3025" />
      <path
        d="M31 41c3 2 6 2 9 0"
        fill="none"
        stroke="#3d3025"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path d="M28 48h16l-8 8-8-8Z" fill={template.shirt} />
      <path d="M34 49h4l-2 7-2-7Z" fill={template.accent} />
      <g
        fill="none"
        stroke={template.accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        <RoleSymbol color={template.accent} symbol={template.symbol} />
      </g>
    </svg>
  );
}
