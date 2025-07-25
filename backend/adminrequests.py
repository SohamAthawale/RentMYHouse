# Admin Requests Module for Rental Management System
from datetime import datetime, timedelta
from sqlalchemy import func
from models import db, User, Flat, ServiceRequest, ServiceExpense, RentPayment

def delete_user_by_unique_id(unique_id):
    """
    Delete a user account by unique_id and clean up all related data.
    
    Args:
        unique_id (str): User's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        user = User.query.filter_by(unique_id=unique_id).first()
        if not user:
            return {"status": "fail", "message": "User not found"}, 404

        username = user.username
        account_type = user.account_type
        
        # If deleting an owner, check if they have active rentals
        if account_type == 'Owner':
            active_rentals = Flat.query.filter_by(owner_unique_id=unique_id)\
                                     .filter(Flat.rented_to_unique_id.isnot(None)).count()
            if active_rentals > 0:
                return {
                    "status": "fail", 
                    "message": f"Cannot delete owner with {active_rentals} active rentals. Vacate properties first."
                }, 400
        
        # If deleting a tenant, update their rented flat
        if account_type == 'Tenant' and user.currently_rented:
            rented_flat = Flat.query.filter_by(rented_to_unique_id=unique_id).first()
            if rented_flat:
                rented_flat.rented_to_unique_id = None

        # Clean up will be handled by CASCADE relationships in the database
        db.session.delete(user)
        db.session.commit()

        return {
            "status": "success",
            "message": f"{account_type} account '{username}' and all related data deleted successfully"
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to delete user: {str(e)}"}, 500

def get_system_statistics():
    """
    Get comprehensive system statistics.
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # User statistics
        total_users = User.query.count()
        total_owners = User.query.filter_by(account_type='Owner').count()
        total_tenants = User.query.filter_by(account_type='Tenant').count()
        active_tenants = User.query.filter_by(account_type='Tenant', currently_rented=True).count()
        
        # Property statistics
        total_properties = Flat.query.count()
        rented_properties = Flat.query.filter(Flat.rented_to_unique_id.isnot(None)).count()
        vacant_properties = total_properties - rented_properties
        occupancy_rate = round((rented_properties / total_properties * 100), 2) if total_properties > 0 else 0
        
        # Service request statistics
        total_service_requests = ServiceRequest.query.count()
        open_requests = ServiceRequest.query.filter_by(status='Open').count()
        in_progress_requests = ServiceRequest.query.filter_by(status='In Progress').count()
        completed_requests = ServiceRequest.query.filter_by(status='Completed').count()
        
        # Financial statistics
        total_rent_collected = RentPayment.query.with_entities(func.sum(RentPayment.amount)).scalar() or 0
        total_expenses = ServiceExpense.query.with_entities(func.sum(ServiceExpense.amount)).scalar() or 0
        net_profit = float(total_rent_collected) - float(total_expenses)
        
        # Average rent calculation
        avg_rent = Flat.query.with_entities(func.avg(Flat.rent)).scalar() or 0
        
        # Recent activity (last 30 days)
        thirty_days_ago = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30)
        
        new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()
        new_properties_30d = Flat.query.filter(Flat.created_at >= thirty_days_ago).count()
        new_requests_30d = ServiceRequest.query.filter(ServiceRequest.requested_at >= thirty_days_ago).count()
        
        # Top property owners by number of properties
        top_owners = db.session.query(
            User.username,
            User.unique_id,
            func.count(Flat.id).label('property_count')
        ).join(Flat, User.unique_id == Flat.owner_unique_id)\
         .group_by(User.unique_id, User.username)\
         .order_by(func.count(Flat.id).desc())\
         .limit(5).all()
        
        top_owners_data = []
        for owner_name, owner_id, prop_count in top_owners:
            top_owners_data.append({
                "username": owner_name,
                "unique_id": owner_id,
                "property_count": prop_count
            })

        statistics = {
            "users": {
                "total_users": total_users,
                "total_owners": total_owners,
                "total_tenants": total_tenants,
                "active_tenants": active_tenants,
                "tenant_occupancy_rate": round((active_tenants / total_tenants * 100), 2) if total_tenants > 0 else 0
            },
            "properties": {
                "total_properties": total_properties,
                "rented_properties": rented_properties,
                "vacant_properties": vacant_properties,
                "occupancy_rate": occupancy_rate,
                "average_rent": str(round(float(avg_rent), 2))
            },
            "service_requests": {
                "total_requests": total_service_requests,
                "open_requests": open_requests,
                "in_progress_requests": in_progress_requests,
                "completed_requests": completed_requests,
                "completion_rate": round((completed_requests / total_service_requests * 100), 2) if total_service_requests > 0 else 0
            },
            "financials": {
                "total_rent_collected": str(total_rent_collected),
                "total_expenses": str(total_expenses),
                "net_profit": str(net_profit),
                "profit_margin": str(round((net_profit / float(total_rent_collected) * 100), 2)) if total_rent_collected > 0 else "0.00"
            },
            "recent_activity": {
                "new_users_30d": new_users_30d,
                "new_properties_30d": new_properties_30d,
                "new_service_requests_30d": new_requests_30d
            },
            "top_owners": top_owners_data,
            "generated_at": datetime.utcnow().isoformat()
        }

        return {"status": "success", "statistics": statistics}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get system statistics: {str(e)}"}, 500

def list_all_users(account_type=None, currently_rented=None):
    """
    List all users with optional filters.
    
    Args:
        account_type (str, optional): Filter by 'Owner' or 'Tenant'
        currently_rented (bool, optional): Filter tenants by rental status
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = User.query
        
        if account_type:
            if account_type not in ['Owner', 'Tenant']:
                return {"status": "fail", "message": "Invalid account type. Must be 'Owner' or 'Tenant'"}, 400
            query = query.filter_by(account_type=account_type)
        
        if currently_rented is not None:
            query = query.filter_by(currently_rented=currently_rented)
        
        users = query.order_by(User.created_at.desc()).all()
        users_data = []
        
        for user in users:
            # Get user statistics
            if user.account_type == 'Owner':
                properties_owned = user.flats_owned.count()
                rented_properties = user.flats_owned.filter(Flat.rented_to_unique_id.isnot(None)).count()
                user_stats = {
                    "properties_owned": properties_owned,
                    "rented_properties": rented_properties,
                    "vacant_properties": properties_owned - rented_properties
                }
            else:
                current_rental = user.flats_rented.first()
                user_stats = {
                    "current_rental": {
                        "flat_unique_id": current_rental.flat_unique_id,
                        "title": current_rental.title,
                        "rent": str(current_rental.rent)
                    } if current_rental else None
                }
            
            user_info = {
                "unique_id": user.unique_id,
                "username": user.username,
                "email": user.email,
                "account_type": user.account_type,
                "contact_no": user.contact_no,
                "currently_rented": user.currently_rented,
                "created_at": user.created_at.isoformat(),
                "statistics": user_stats
            }
            users_data.append(user_info)

        return {"status": "success", "users": users_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to list users: {str(e)}"}, 500

def get_user_detailed_info(unique_id):
    """
    Get detailed information about a specific user.
    
    Args:
        unique_id (str): User's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        user = User.query.filter_by(unique_id=unique_id).first()
        if not user:
            return {"status": "fail", "message": "User not found"}, 404

        user_info = {
            "unique_id": user.unique_id,
            "username": user.username,
            "email": user.email,
            "account_type": user.account_type,
            "contact_no": user.contact_no,
            "currently_rented": user.currently_rented,
            "created_at": user.created_at.isoformat()
        }

        if user.account_type == 'Owner':
            # Get owner's properties
            properties = []
            for flat in user.flats_owned.all():
                property_info = {
                    "flat_unique_id": flat.flat_unique_id,
                    "title": flat.title,
                    "address": flat.address,
                    "rent": str(flat.rent),
                    "is_rented": flat.rented_to_unique_id is not None,
                    "tenant": {
                        "unique_id": flat.tenant.unique_id,
                        "username": flat.tenant.username
                    } if flat.tenant else None
                }
                properties.append(property_info)
            
            # Get service requests for owner's properties
            service_requests = user.service_requests_as_owner.order_by(ServiceRequest.requested_at.desc()).limit(10).all()
            requests_data = []
            for req in service_requests:
                requests_data.append({
                    "request_unique_id": req.request_unique_id,
                    "title": req.title,
                    "category": req.category,
                    "priority": req.priority,
                    "status": req.status,
                    "requested_at": req.requested_at.isoformat(),
                    "flat_title": req.flat.title
                })
            
            user_info.update({
                "properties": properties,
                "recent_service_requests": requests_data,
                "statistics": {
                    "total_properties": len(properties),
                    "rented_properties": sum(1 for p in properties if p["is_rented"]),
                    "total_service_requests": user.service_requests_as_owner.count()
                }
            })
        
        else:  # Tenant
            # Get current rental
            current_rental = user.flats_rented.first()
            rental_info = None
            if current_rental:
                rental_info = {
                    "flat_unique_id": current_rental.flat_unique_id,
                    "title": current_rental.title,
                    "address": current_rental.address,
                    "rent": str(current_rental.rent),
                    "owner": {
                        "unique_id": current_rental.owner.unique_id,
                        "username": current_rental.owner.username,
                        "contact_no": current_rental.owner.contact_no
                    }
                }
            
            # Get tenant's service requests
            service_requests = user.service_requests_as_tenant.order_by(ServiceRequest.requested_at.desc()).limit(10).all()
            requests_data = []
            for req in service_requests:
                requests_data.append({
                    "request_unique_id": req.request_unique_id,
                    "title": req.title,
                    "category": req.category,
                    "priority": req.priority,
                    "status": req.status,
                    "requested_at": req.requested_at.isoformat(),
                    "flat_title": req.flat.title
                })
            
            user_info.update({
                "current_rental": rental_info,
                "service_requests": requests_data,
                "statistics": {
                    "total_service_requests": user.service_requests_as_tenant.count(),
                    "rental_history_count": 1 if current_rental else 0  # Simplified for now
                }
            })

        return {"status": "success", "user_details": user_info}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get user details: {str(e)}"}, 500

def cleanup_orphaned_data():
    """
    Clean up any orphaned data in the system.
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        cleanup_results = {
            "flats_cleaned": 0,
            "service_requests_cleaned": 0,
            "payments_cleaned": 0,
            "expenses_cleaned": 0
        }

        # Find and clean up orphaned flats (owner doesn't exist)
        orphaned_flats = db.session.query(Flat).outerjoin(User, Flat.owner_unique_id == User.unique_id)\
                                              .filter(User.unique_id.is_(None)).all()
        
        for flat in orphaned_flats:
            db.session.delete(flat)
            cleanup_results["flats_cleaned"] += 1

        # Find and clean up service requests with missing references
        orphaned_requests = db.session.query(ServiceRequest)\
                                    .outerjoin(Flat, ServiceRequest.flat_unique_id == Flat.flat_unique_id)\
                                    .filter(Flat.flat_unique_id.is_(None)).all()
        
        for request in orphaned_requests:
            db.session.delete(request)
            cleanup_results["service_requests_cleaned"] += 1

        # Update tenant rental status based on actual flat assignments
        tenants_to_update = User.query.filter_by(account_type='Tenant', currently_rented=True).all()
        for tenant in tenants_to_update:
            has_rental = Flat.query.filter_by(rented_to_unique_id=tenant.unique_id).first()
            if not has_rental:
                tenant.currently_rented = False

        db.session.commit()

        return {
            "status": "success",
            "message": "System cleanup completed successfully",
            "cleanup_results": cleanup_results
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to cleanup system: {str(e)}"}, 500

def export_system_data():
    """
    Export system data for backup purposes.
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Get all users
        users = User.query.all()
        users_data = []
        for user in users:
            users_data.append({
                "unique_id": user.unique_id,
                "username": user.username,
                "email": user.email,
                "account_type": user.account_type,
                "contact_no": user.contact_no,
                "currently_rented": user.currently_rented,
                "created_at": user.created_at.isoformat()
            })

        # Get all flats
        flats = Flat.query.all()
        flats_data = []
        for flat in flats:
            flats_data.append({
                "flat_unique_id": flat.flat_unique_id,
                "owner_unique_id": flat.owner_unique_id,
                "title": flat.title,
                "address": flat.address,
                "rent": str(flat.rent),
                "created_at": flat.created_at.isoformat(),
                "rented_to_unique_id": flat.rented_to_unique_id
            })

        # Get all service requests
        requests = ServiceRequest.query.all()
        requests_data = []
        for req in requests:
            requests_data.append({
                "request_unique_id": req.request_unique_id,
                "flat_unique_id": req.flat_unique_id,
                "tenant_unique_id": req.tenant_unique_id,
                "owner_unique_id": req.owner_unique_id,
                "title": req.title,
                "description": req.description,
                "category": req.category,
                "priority": req.priority,
                "status": req.status,
                "requested_at": req.requested_at.isoformat(),
                "completed_at": req.completed_at.isoformat() if req.completed_at else None
            })

        export_data = {
            "export_timestamp": datetime.utcnow().isoformat(),
            "system_version": "1.0",
            "data": {
                "users": users_data,
                "flats": flats_data,
                "service_requests": requests_data
            },
            "summary": {
                "total_users": len(users_data),
                "total_flats": len(flats_data),
                "total_service_requests": len(requests_data)
            }
        }

        return {"status": "success", "export_data": export_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to export system data: {str(e)}"}, 500