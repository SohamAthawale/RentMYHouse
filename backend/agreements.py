import uuid
from datetime import datetime
from models import db, RentAgreement, Flat, User
from flask import send_file
import io

def upload_rent_agreement(flat_id, tenant_id, agreement_date, start_date, end_date, file_storage):
    try:
        # Validate file
        if not file_storage or file_storage.filename == '':
            return {"status": "fail", "message": "No file provided"}, 400
            
        file_data = file_storage.read()
        if len(file_data) > 10 * 1024 * 1024:  # 10MB limit
            return {"status": "fail", "message": "File too large (max 10MB)"}, 400

        # Check flat and tenant
        flat = Flat.query.filter_by(flat_unique_id=flat_id).first()
        tenant = User.query.filter_by(unique_id=tenant_id).first()
        
        if not flat or not tenant:
            return {"status": "fail", "message": "Flat or tenant not found"}, 404

        # Create agreement record
        agreement = RentAgreement(
            flat_unique_id=flat_id,
            tenant_unique_id=tenant_id,
            agreement_date=agreement_date,
            start_date=start_date,
            end_date=end_date,
            file_name=file_storage.filename,
            mime_type=file_storage.content_type or 'application/pdf',
            file_size=len(file_data),
            file_data=file_data
        )
        
        db.session.add(agreement)
        db.session.commit()
        
        return {
            "status": "success",
            "message": "Agreement uploaded successfully",
            "agreement_id": str(agreement.unique_id)
        }, 201
        
    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Upload failed: {str(e)}"}, 500

def get_agreements(flat_id=None, tenant_id=None):
    try:
        query = RentAgreement.query
        if flat_id:
            query = query.filter_by(flat_unique_id=flat_id)
        if tenant_id:
            query = query.filter_by(tenant_unique_id=tenant_id)
            
        agreements = query.all()
        
        result = []
        for agreement in agreements:
            result.append({
                "agreement_id": str(agreement.unique_id),
                "flat_id": agreement.flat_unique_id,
                "tenant_id": agreement.tenant_unique_id,
                "agreement_date": agreement.agreement_date.isoformat(),
                "start_date": agreement.start_date.isoformat(),
                "end_date": agreement.end_date.isoformat(),
                "file_name": agreement.file_name,
                "file_size": agreement.file_size,
                "created_at": agreement.created_at.isoformat()
            })
            
        return {"status": "success", "agreements": result}, 200
        
    except Exception as e:
        return {"status": "fail", "message": str(e)}, 500

def download_agreement(agreement_id):
    try:
        agreement = RentAgreement.query.filter_by(unique_id=agreement_id).first()
        if not agreement:
            return None, {"status": "fail", "message": "Agreement not found"}, 404
            
        return send_file(
            io.BytesIO(agreement.file_data),
            mimetype=agreement.mime_type,
            as_attachment=True,
            download_name=agreement.file_name
        ), None, 200
        
    except Exception as e:
        return None, {"status": "fail", "message": str(e)}, 500
