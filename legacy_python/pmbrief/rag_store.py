from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import google.generativeai as genai
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from .config import embedding_model_name, get_env_str


@dataclass
class GeminiEmbeddingFunction:
	model: str

	def __post_init__(self) -> None:
		api_key = get_env_str("GEMINI_API_KEY")
		if not api_key:
			raise RuntimeError("GEMINI_API_KEY not set")
		genai.configure(api_key=api_key)

	def embed_documents(self, texts: Sequence[str]) -> List[List[float]]:
		vectors: List[List[float]] = []
		for text in texts:
			resp = genai.embed_content(model=self.model, content=text)
			vectors.append(resp["embedding"])
		return vectors

	def embed_query(self, text: str) -> List[float]:
		resp = genai.embed_content(model=self.model, content=text)
		return resp["embedding"]


class RAGStore:
	def __init__(self, path: Path) -> None:
		self.path = Path(path)
		self.path.mkdir(parents=True, exist_ok=True)
		self.embedding = GeminiEmbeddingFunction(model=embedding_model_name())
		self.vs: Optional[FAISS] = None

	def load(self) -> None:
		if (self.path / "index.faiss").exists():
			self.vs = FAISS.load_local(
				str(self.path),
				self.embedding,
				allow_dangerous_deserialization=True,
			)
		else:
			self.vs = FAISS.from_texts([""], self.embedding, metadatas=[{"seed": True}])
			# drop the seed doc
			self.vs.docstore._dict.pop(list(self.vs.docstore._dict.keys())[0], None)

	def save(self) -> None:
		if not self.vs:
			return
		self.vs.save_local(str(self.path))

	def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> None:
		if not texts:
			return
		if self.vs is None:
			self.load()
		if metadatas is None:
			metadatas = [{} for _ in texts]
		self.vs.add_texts(texts=texts, metadatas=metadatas)

	def retrieve(self, query: str, k: int = 6) -> List[Document]:
		if self.vs is None:
			self.load()
		return self.vs.similarity_search(query, k=k)

