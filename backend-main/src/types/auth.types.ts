export const userRoles = ["staff", "inventory_officer", "admin"] as const;
export const accountStatuses = ["active", "inactive"] as const;

export type UserRole = (typeof userRoles)[number];

/**
 * Pemetaan peran laporan ke nilai role di database:
 * admin = Admin, inventory_officer = Petugas, staff = Peminjam.
 */
export const roleGroups = {
  admin: ["admin"],
  operators: ["admin", "inventory_officer"],
  everyone: userRoles,
} as const satisfies Record<string, readonly UserRole[]>;
export type AccountStatus = (typeof accountStatuses)[number];

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  staffId: string;
  schoolUnit: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  staffId: string;
  schoolUnit: string;
  role: UserRole;
  accountStatus: AccountStatus;
}

export interface UserProfilePayload {
  user_id: string;
  full_name: string;
  email: string;
  staff_id: string;
  school_unit: string;
  role: UserRole;
  account_status: AccountStatus;
}

export interface AuthSessionPayload {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_at: number;
}

export interface RegisterResult {
  userId: string;
  email: string;
  emailVerificationRequired: boolean;
  session?: AuthSessionPayload;
}

export interface LoginResult {
  session: AuthSessionPayload;
  user: UserProfile;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  sessionId: string;
  expiresAt: number;
  accessToken: string;
}

export interface AuthService {
  register(input: RegisterInput): Promise<RegisterResult>;
  login(input: LoginInput): Promise<LoginResult>;
  refresh(input: RefreshInput): Promise<LoginResult>;
  authenticate(accessToken: string): Promise<AuthenticatedUser>;
  getCurrentProfile(identity: AuthenticatedUser): Promise<UserProfile>;
  logout(identity: AuthenticatedUser): Promise<void>;
}

export function toUserProfilePayload(profile: UserProfile): UserProfilePayload {
  return {
    user_id: profile.userId,
    full_name: profile.fullName,
    email: profile.email,
    staff_id: profile.staffId,
    school_unit: profile.schoolUnit,
    role: profile.role,
    account_status: profile.accountStatus,
  };
}
