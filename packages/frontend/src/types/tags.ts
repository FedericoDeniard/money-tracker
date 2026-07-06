import type { Database } from "./database.types";
import type { TagColor } from "../constants/tags";

export type { TagColor };

export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
export type TagUpdate = Database["public"]["Tables"]["tags"]["Update"];
export type TransactionTagRow =
  Database["public"]["Tables"]["transaction_tags"]["Row"];

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: TagColor;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionTagLite {
  id: string;
  name: string;
  color: TagColor;
}
