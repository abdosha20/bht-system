import { createServiceClient } from "@/lib/supabase/server";

const roleToDocTypes: Record<string, string[]> = {
  DIRECTOR: ["*"],
  MANAGER: [
    "STAFF",
    "CLIENT",
    "GENERAL",
    "SUPPLIER",
    "COMPANY_POLICY",
    "COMPANY_LEGAL",
    "COMPANY_FINANCE",
    "COMPANY_HR",
    "COMPANY_COMPLIANCE",
    "CONTRACT",
    "VENDOR",
    "BOARD",
    "TAX"
  ],
  STAFF: ["GENERAL", "COMPANY_POLICY"]
};

export async function canReadDocument(userId: string, role: string, docUid: string, docType?: string) {
  const service = createServiceClient();

  const { data: doc } = await service
    .from("documents")
    .select("doc_uid,doc_type,staff_id,client_id,supplier_id,created_by")
    .eq("doc_uid", docUid)
    .single();

  if (!doc) {
    return false;
  }

  // Owner access: uploader can always read their own records, including custom types.
  if (doc.created_by === userId) {
    return true;
  }

  const effectiveDocType = docType ?? doc.doc_type;
  const allowed = roleToDocTypes[role] ?? [];
  if (!allowed.includes("*") && !allowed.includes(effectiveDocType)) {
    return false;
  }

  if (allowed.includes("*")) {
    return true;
  }

  if (role === "MANAGER") {
    if (effectiveDocType === "STAFF" && doc.staff_id) {
      const { data } = await service
        .from("manager_staff_assignment")
        .select("staff_id")
        .eq("manager_id", userId)
        .eq("staff_id", doc.staff_id)
        .limit(1);
      return Boolean(data && data.length > 0);
    }

    if (effectiveDocType === "CLIENT" && doc.client_id) {
      const { data } = await service
        .from("client_manager_assignment")
        .select("client_id")
        .eq("manager_id", userId)
        .eq("client_id", doc.client_id)
        .limit(1);
      return Boolean(data && data.length > 0);
    }
  }

  return doc.created_by === userId;
}
