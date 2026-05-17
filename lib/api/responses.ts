import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(
    { data },
    {
      status,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export function fail(message: string, status = 500) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
