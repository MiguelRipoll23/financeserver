import { inject, injectable } from "@needle-di/core";
import { eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { ServerError } from "../../models/server-error.ts";
import {
  usersTable,
  type UserEntity,
  type UserInsertEntity,
} from "../../../../../db/tables/users-table.ts";
import type {
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
} from "../../schemas/users-schemas.ts";
import type { UserInterface } from "../../interfaces/users/user-interface.ts";

@injectable()
export class UsersService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createUser(
    payload: CreateUserRequest
  ): Promise<CreateUserResponse> {
    const db = this.databaseService.get();
    const sanitizedHandle = this.sanitizeHandle(payload.githubHandle);
    const normalizedHandle = this.normalizeHandle(sanitizedHandle);
    const displayName = this.sanitizeDisplayName(payload.displayName) ?? null;

    const entity: UserInsertEntity = {
      githubHandle: sanitizedHandle,
      githubHandleNormalized: normalizedHandle,
      displayName,
    };

    try {
      const [created] = await db.insert(usersTable).values(entity).returning({
        id: usersTable.id,
        githubHandle: usersTable.githubHandle,
        displayName: usersTable.displayName,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });

      if (!created) {
        throw new ServerError(
          "USER_CREATION_FAILED",
          "Failed to create user",
          500
        );
      }

      return this.mapEntityToResponse(created);
    } catch (error) {
      if (error instanceof ServerError) {
        throw error;
      }
      throw this.handlePersistenceError(error);
    }
  }

  public async updateUser(
    id: string,
    payload: UpdateUserRequest
  ): Promise<UpdateUserResponse> {
    const db = this.databaseService.get();

    const values: Partial<UserInsertEntity> = {
      updatedAt: new Date(),
    };

    if (payload.githubHandle !== undefined) {
      const sanitizedHandle = this.sanitizeHandle(payload.githubHandle);
      values.githubHandle = sanitizedHandle;
      values.githubHandleNormalized = this.normalizeHandle(sanitizedHandle);
    }

    if (payload.displayName !== undefined) {
      values.displayName =
        this.sanitizeDisplayName(payload.displayName) ?? null;
    }

    try {
      const [updated] = await db
        .update(usersTable)
        .set(values)
        .where(eq(usersTable.id, id))
        .returning({
          id: usersTable.id,
          githubHandle: usersTable.githubHandle,
          displayName: usersTable.displayName,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
        });

      if (!updated) {
        throw new ServerError(
          "USER_NOT_FOUND",
          `User ${id} was not found`,
          404
        );
      }

      return this.mapEntityToResponse(updated);
    } catch (error) {
      if (error instanceof ServerError) {
        throw error;
      }
      throw this.handlePersistenceError(error, id);
    }
  }

  public async deleteUser(id: string): Promise<void> {
    const db = this.databaseService.get();

    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    if (!deleted) {
      throw new ServerError("USER_NOT_FOUND", `User ${id} was not found`, 404);
    }
  }

  public async getAuthorizedUserByGitHubLogin(
    login: string
  ): Promise<UserInterface | null> {
    const db = this.databaseService.get();
    const normalizedHandle = this.normalizeHandle(login);

    const [authorized] = await db
      .select({
        id: usersTable.id,
        githubHandle: usersTable.githubHandle,
        displayName: usersTable.displayName,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.githubHandleNormalized, normalizedHandle))
      .limit(1);

    if (!authorized) {
      return null;
    }

    return this.mapEntityToResponse(authorized);
  }

  private sanitizeHandle(handle: string): string {
    return handle.trim().replace(/^@+/, "");
  }

  private normalizeHandle(handle: string): string {
    return this.sanitizeHandle(handle).toLowerCase();
  }

  private sanitizeDisplayName(
    value: string | null | undefined
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    return trimmed;
  }

  private mapEntityToResponse(
    entity: Pick<
      UserEntity,
      "id" | "githubHandle" | "displayName" | "createdAt" | "updatedAt"
    >
  ): UserInterface {
    return {
      id: entity.id,
      githubHandle: entity.githubHandle,
      displayName: entity.displayName ?? null,
      createdAt: this.toIsoString(entity.createdAt),
      updatedAt: this.toIsoString(entity.updatedAt),
    } satisfies UserInterface;
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new ServerError(
        "USER_TIMESTAMP_INVALID",
        "Stored user timestamp is invalid",
        500
      );
    }

    return parsed.toISOString();
  }

  private handlePersistenceError(error: unknown, id?: string): ServerError {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return new ServerError(
        "USER_ALREADY_EXISTS",
        "GitHub handle is already authorized",
        409
      );
    }

    console.error("User persistence error", { error, id });

    return new ServerError(
      "USER_PERSISTENCE_ERROR",
      "User persistence failed",
      500
    );
  }
}
