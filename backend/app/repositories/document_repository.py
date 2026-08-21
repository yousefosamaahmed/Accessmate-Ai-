from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.document_schema import DocumentCreate, DocumentUpdate

class DocumentRepository:
    def __init__(self , db: Session):
        self.db = db

    def create_document(self,document_data: DocumentCreate) -> Document : 
    
        document = Document (**document_data.model_dump())  

        self.db.add(document)  
        self.db.commit()
        self.db.refresh(document)  

        return document
    
    def get_document_by_id(self, document_id: UUID) -> Optional[Document]:
        return (
            self.db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )
    
    def get_documents_by_user_id(self, user_id: UUID) -> List[Document]:
        return (
            self.db.query(Document)
            .filter(Document.user_id == user_id)
            .order_by(Document.created_at.desc())
            .all()
        )
    
    def update_document( self, document: Document, document_data: DocumentUpdate ) -> Document:
        update_data = document_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(document, field, value)

        self.db.commit()
        self.db.refresh(document)

        return document
    
    def delete_document(self, document: Document) -> bool : 
        
        self.db.delete(document)
        self.db.commit()

        return True