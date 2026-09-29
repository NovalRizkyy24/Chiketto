/** Error yang pesannya aman ditampilkan ke pengguna. */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BAD_REQUEST",
  ) {
    super(message);
  }
}

export class QuotaUnavailableError extends AppError {
  constructor(ticketTypeName?: string) {
    super(
      ticketTypeName
        ? `Kuota ${ticketTypeName} sudah habis atau penjualannya ditutup.`
        : "Kuota tiket sudah habis atau penjualannya ditutup.",
      409,
      "QUOTA_UNAVAILABLE",
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Kamu perlu masuk terlebih dahulu.", 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("Kamu tidak punya akses untuk aksi ini.", 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(what = "Data") {
    super(`${what} tidak ditemukan.`, 404, "NOT_FOUND");
  }
}
