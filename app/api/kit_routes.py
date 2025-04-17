from flask import jsonify, request
from . import api_bp
from ..models import (
    Kit, Phone, SimCard, RightSensor, LeftSensor,
    Headphone, db, ComponentUsage, Distributor,Box
)
from datetime import datetime

@api_bp.route('/kits/getAll', methods=['GET'])
def get_all_kits():
    """get all kits"""
    try:
        kits = Kit.query.all()
        return jsonify([{
            'id': kit.id,
            'created_at': kit.created_at,
            'status': kit.status,
            'batch_number': 0000,
            'distributor': kit.distributor_name if kit.distributor else None,
            'dispense_date': kit.dispense_date
        } for kit in kits]), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching kits', 'details': str(e)}), 500


@api_bp.route('/kits/<string:kit_id>', methods=['GET'])
def get_kit_by_id(kit_id):
    """get kit by id"""
    try:

        kit = Kit.query.get_or_404(kit_id)
        return jsonify({
            'id': kit.id,
            'created_at': kit.created_at,
            'status': kit.status,
            'batch_number': 0,
            'distributor': kit.distributor,
            'dispense_date': kit.dispense_date,
            'components': {
                'phone': kit.phone.id if kit.phone else None,
                'sim_card': kit.sim_card.id if kit.sim_card else None,
                'right_sensor': kit.right_sensor.id if kit.right_sensor else None,
                'left_sensor': kit.left_sensor.id if kit.left_sensor else None,
                'headphone': kit.headphone.id if kit.headphone else None,
                'box': kit.box.id if kit.box else None
            }
        }), 200
    except Exception as e:
        return jsonify({'message': 'Kit not found', 'details': str(e)}), 404

@api_bp.route('/kits/sortByCreatedAtDesc', methods=['GET'])
def get_kits_by_created_at_desc():
    """get all kits in descending order by its creating timestamp"""
    try:
        kits = Kit.query.order_by(Kit.created_at.desc()).all()
        return jsonify([{
            'id': kit.id,
            'created_at': kit.created_at,
            'status': kit.status,
            'batch_number': kit.batch_number
        } for kit in kits]), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching kits', 'details': str(e)}), 500

@api_bp.route('/kits/filterByCreatedAtRange', methods=['GET'])
def get_kits_by_date_range():
    """get kits by its creation date range"""
    try:
        start_date = datetime.strptime(request.args.get('startDate'), '%Y-%m-%d')
        end_date = datetime.strptime(request.args.get('endDate'), '%Y-%m-%d')
        if start_date > end_date:
            return jsonify({
                'message': 'Invalid date range: startDate must be earlier than endDate'
            }), 400

        kits = Kit.query.filter(
            Kit.created_at.between(start_date, end_date),
            Kit.status.in_(["Available", "In-use", "Used"])
        ).all()

        return jsonify([{
            'id': kit.id,
            'created_at': kit.created_at.isoformat(),
            'status': kit.status,
            'batch_number': 0000,
            'distributor': kit.distributor_name if kit.distributor else None,
            'dispense_date': kit.dispense_date.isoformat() if kit.dispense_date else None
        } for kit in kits]), 200
    except ValueError:
        return jsonify({'message': 'Invalid date format'}), 400
    except Exception as e:
        return jsonify({'message': 'Error fetching kits', 'details': str(e)}), 500

@api_bp.route('/kits/filterByBatchNumber', methods=['GET'])
def get_kits_by_batch_number():
    """get kits by batch number"""
    try:
        batch_number = request.args.get('batchNumber')
        kits = Kit.query.filter_by(batch_number=batch_number).all()

        if not kits:
            return jsonify({'message': 'No kits found with this batch number'}), 404

        return jsonify([{
            'id': kit.id,
            'created_at': kit.created_at,
            'status': kit.status,
            'batch_number': kit.batch_number
        } for kit in kits]), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching kits', 'details': str(e)}), 500

@api_bp.route('/kits/filterByStatus', methods=['GET'])
def get_kits_by_status():
    """get kits by its status"""
    valid_statuses = ['Available', 'Unavailable', 'Bound', 'Scrapped', 'Furbishing', 'Other']
    try:
        status = request.args.get('status')
        if status not in valid_statuses:
            return jsonify({'message': 'Invalid status'}), 400
            
        kits = Kit.query.filter_by(status=status).all()
        return jsonify([{
            'id': kit.id,
            'created_at': kit.created_at,
            'status': kit.status,
            'batch_number': kit.batch_number
        } for kit in kits]), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching kits', 'details': str(e)}), 500


@api_bp.route('/kits/filterByDistributorId', methods=['GET'])
def get_kits_by_distributor_id():
    """Get kits by distributor ID"""
    try:
        distributor_id = request.args.get('distributorId')

        if not distributor_id:
            return jsonify({'message': 'Missing distributorId parameter'}), 400

        kits = Kit.query.filter_by(distributor_id=distributor_id).all()

        if not kits:
            return jsonify({'message': f'No kits found for distributorId {distributor_id}'}), 404

        return jsonify([{
            'id': kit.id,
            'created_at': kit.created_at,
            'status': kit.status,
            'batch_number': kit.batch_number,
            'distributor_id': kit.distributor_id,
            'distributor_name': kit.distributor_name,
            'dispense_date': kit.dispense_date
        } for kit in kits]), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching kits', 'details': str(e)}), 500


#distribute kits
@api_bp.route('/kits/distribute', methods=['POST'])
def distribute_kits():
    """Distribute kits to a distributor"""
    try:
        data = request.get_json()
        kits_ids = data.get('kits')
        distributor_id = data.get('distributor_id')
        start_time_str = data.get('start_time')
        if not kits_ids or not distributor_id:
            return jsonify({'message': 'Missing required fields: kits or distributor_id'}), 400


        distributor = Distributor.query.get(distributor_id)
        if not distributor:
            return jsonify({'message': f'Distributor {distributor_id} not found'}), 404


        start_time = datetime.utcnow()
        if start_time_str:
            try:
                start_time = datetime.strptime(start_time_str, "%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                return jsonify({'message': 'Invalid start_time format (use ISO 8601)'}), 400

        for kit_id in kits_ids:
            kit = Kit.query.get(kit_id)
            print(kit)
            if not kit:
                return jsonify({'message': f'Kit {kit_id} not found'}), 404

            kit.distributor_id = distributor_id
            kit.distributor_name = distributor.name
            kit.status = 'In-use'
            kit.dispense_date = start_time

            components = [
                ('phone', kit.phone),
                ('sim_card', kit.sim_card),
                ('right_sensor', kit.right_sensor),
                ('left_sensor', kit.left_sensor),
                ('headphone', kit.headphone),
                ('box', kit.box)
            ]
            print(components)
            # Create new records
            for component_type, component in components:
                if not component:
                    continue

                new_usage = ComponentUsage(
                    component_id=component.id,
                    component_type=component_type,
                    kit_id=kit_id,
                    distributor_id=distributor_id,
                    start_time=start_time
                )
                db.session.add(new_usage)

        db.session.commit()
        return jsonify({'message': f'{len(kits_ids)} kits distributed successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Distribution failed', 'error': str(e)}), 500


#collect kits back
@api_bp.route('/kits/collect', methods=['PATCH'])
def collect_kits():
    """upadate the end_time in component_usage """
    try:
        data = request.get_json()
        print(data)
        kits_ids = data.get('kits')
        end_time_str = data.get('endTime')

        if not kits_ids:
            return jsonify({'message': 'Missing required fields: kits or distributorId'}), 400

        end_time = datetime.utcnow()
        if end_time_str:
            try:
                end_time = datetime.strptime(end_time_str, "%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                return jsonify({'message': 'Invalid endTime format (use ISO 8601)'}), 400


        for kit_id in kits_ids:
            kit = Kit.query.get(kit_id)
            if not kit:
                return jsonify({'message': f'Kit {kit_id} not found'}), 404

            kit.status = 'Used'
            kit.distributor_id = None

            components = [
                ('phone', kit.phone),
                ('sim_card', kit.sim_card),
                ('right_sensor', kit.right_sensor),
                ('left_sensor', kit.left_sensor),
                ('headphone', kit.headphone),
                ('box', kit.box)
            ]


            for component_type, component in components:
                if not component:
                    continue


                latest_usage = ComponentUsage.query.filter(
                    ComponentUsage.component_id == component.id,
                    ComponentUsage.component_type == component_type,
                    ComponentUsage.kit_id == kit_id
                ).order_by(ComponentUsage.start_time.desc()).first()


                if not latest_usage or latest_usage.end_time is not None:
                    return jsonify({
                        'message': f'Component {component.id} is not in using stage or has been collected ',
                        'component_id': component.id,
                        'component_type': component_type
                    }), 400

                if end_time <= latest_usage.start_time:
                    return jsonify({
                        'message': f'End time cannot be earlier than or equal to start time for component {component.id}',
                        'component_id': component.id,
                        'component_type': component_type
                    }), 400

                latest_usage.end_time = end_time
                db.session.add(latest_usage)

        db.session.commit()
        return jsonify({'message': f'{len(kits_ids)} kits collected successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Collection failed', 'error': str(e)}), 500