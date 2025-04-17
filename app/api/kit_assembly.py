import random

from flask import jsonify, request
from datetime import datetime
from . import api_bp
from ..models import (
    Kit, Phone, SimCard, RightSensor, LeftSensor, 
    Headphone, db, Box
)

kit_creation_counter = {
    'date': None,
    'count': 0
}


def generate_kit_id():
    today = datetime.now().strftime('%m%d%y')  # e.g., 092623
    current_date = datetime.now().date()

    if kit_creation_counter['date'] != current_date:
        kit_creation_counter['date'] = current_date
        kit_creation_counter['count'] = 1
    else:
        kit_creation_counter['count'] += 1

    count = kit_creation_counter['count']
    if count <= 999:
        serial_number = f"MR{today}{count:03d}"  #  MR092623001
    elif count <= 9999:
        serial_number = f"MR{today}{count:04d}"  #  MR0926231000
    else:
        serial_number = f"MR{today}{count:05d}"  # MR09262310000

    return serial_number


@api_bp.route('/kits/create', methods=['POST'])
def create_kit():
    """Create a kit with components chosen"""
    try:
        data = request.get_json()
        print(data)
        # Define mapping
        required_components = {
            'phone_ID': Phone,
            'SIM_card_ID': SimCard,
            'right_sensor_ID': RightSensor,
            'left_sensor_ID': LeftSensor,
            'headphones_ID': Headphone,
            'box_ID': Box
        }

        components = {}
        unavailable_components = []

        # check availability
        for component_id_key, model in required_components.items():
            component_id = data.get(component_id_key)
            component = model.query.get(component_id)

            if component:
                if component.status != 'available':
                    unavailable_components.append({
                        'component_id_key': component_id_key,
                        'component_id': component_id,
                        'status': component.status
                    })
                else:
                    components[component_id_key] = component

        # return info of unavailable components
        if unavailable_components:
            return jsonify({
                'message': 'Some components are not available',
                'unavailable_components': unavailable_components
            }), 400

        #id creator
        new_kit_id = generate_kit_id()

        # kit instance generator
        new_kit = Kit(
            id=new_kit_id,
        )
        db.session.add(new_kit)

        # update relevant components' status
        for component_id_key, component in components.items():
            component.status = 'in-kit'
            component.kit_id = new_kit_id

        db.session.commit()

        return jsonify({
            'message': 'Kit created successfully',
            'kit_ID': new_kit_id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Error creating kit',
            'details': str(e)
        }), 400

@api_bp.route('/kits/disassemble', methods=['POST'])
def disassemble_kit():
    try:
        data = request.get_json()
        kit_id = data.get('kit_ID')
        
        if not kit_id:
            return jsonify({
                'message': 'Missing kit_ID',
                'details': 'kit_ID is required'
            }), 400
            
        kit = Kit.query.get(kit_id)
        if not kit:
            return jsonify({
                'message': 'Kit not found',
                'details': f'Kit {kit_id} does not exist'
            }), 404
            
        updated_components = []
        components = [
            ('phone', kit.phone),
            ('SIM_card', kit.sim_card),
            ('right_sensor', kit.right_sensor),
            ('left_sensor', kit.left_sensor),
            ('headphone', kit.headphone),
            ('box', kit.box)
        ]

        for component_type, component in components:
            if component:
                component.status = 'refurbishing'
                component.kit_id = None
                updated_components.append({
                    'component_type': component_type,
                    'component_ID': component.id,
                    'status': component.status
                })
        
        kit.status = 'Scarped'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Kit disassembled successfully',
            'updated_components': updated_components
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Error disassembling components',
            'details': str(e)
        }), 400


@api_bp.route('/kits/disassemble_many', methods=['POST'])
def batch_disassemble_kit():
    try:
        data = request.get_json()
        kit_ids = data.get('kit_IDs')

        if not kit_ids or not isinstance(kit_ids, list):
            return jsonify({
                'message': 'Invalid or missing kit_IDs',
                'details': 'kit_IDs must be a list of kit IDs'
            }), 400

        updated_components = []
        failed_kit_ids = []

        for kit_id in kit_ids:
            kit = Kit.query.get(kit_id)

            if not kit:
                failed_kit_ids.append({
                    'kit_ID': kit_id,
                    'message': f'Kit {kit_id} does not exist'
                })
                continue  # Skip to the next kit if not found

            components = [
                ('phone', kit.phone),
                ('SIM_card', kit.sim_card),
                ('right_sensor', kit.right_sensor),
                ('left_sensor', kit.left_sensor),
                ('headphone', kit.headphone),
                ('box', kit.box)
            ]
            print(components)

            for component_type, component in components:
                if component:
                    component.status = 'refurbishing'
                    component.kit_id = None
                    updated_components.append({
                        'kit_ID': kit_id,
                        'component_type': component_type,
                        'component_ID': component.id,
                        'status': component.status
                    })

            kit.status = 'Scarped'

        # Commit all the changes
        db.session.commit()

        return jsonify({
            'message': 'Batch disassemble completed',
            'updated_components': updated_components,
            'failed_kits': failed_kit_ids
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Error disassembling kits',
            'details': str(e)
        }), 400


@api_bp.route('/kits/create_many', methods=['POST'])
def create_many_kits():
    """batch create kits"""
    try:
        data_list = request.get_json()
        created_kits = []
        errors = []

        for index, data in enumerate(data_list):
            try:
                required_components = {
                    'phone_ID': Phone,
                    'SIM_card_ID': SimCard,
                    'right_sensor_ID': RightSensor,
                    'left_sensor_ID': LeftSensor,
                    'headphones_ID': Headphone,
                    'box_ID': Box,
                }

                components = {}
                unavailable_components = []

                for component_id_key, model in required_components.items():
                    component_id = data.get(component_id_key)
                    component = model.query.get(component_id)

                    if component:
                        if component.status != 'available':
                            unavailable_components.append({
                                'component_id_key': component_id_key,
                                'component_id': component_id,
                                'status': component.status
                            })
                        else:
                            components[component_id_key] = component

                if unavailable_components:
                    errors.append({
                        'index': index,
                        'message': 'Some components are not available',
                        'unavailable_components': unavailable_components
                    })
                    continue

                new_kit_id = generate_kit_id()

                new_kit = Kit(id=new_kit_id)
                db.session.add(new_kit)

                for component in components.values():
                    component.status = 'in-kit'
                    component.kit_id = new_kit_id

                created_kits.append(new_kit_id)

            except Exception as e:
                errors.append({
                    'index': index,
                    'message': 'Error creating kit',
                    'details': str(e)
                })

        db.session.commit()

        return jsonify({
            'message': 'Batch kit creation completed',
            'created_kits': created_kits,
            'errors': errors
        }), 201 if created_kits else 400

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Error processing batch kit creation',
            'details': str(e)
        }), 400

@api_bp.route('/kits/satus_change', methods=['POST'])
def kits_satus_change():
    try:
        data = request.get_json()
        kit_id = data['kit_id']
        status = data['status']
        kit = Kit.query.get(kit_id)
        if not kit:
            return jsonify({
                'message': 'Kit not found',
                'details': f'Kit {kit_id} does not exist'
            }), 400
        if status == kit.status:
            return jsonify({
                'message': f'Kit is already in status {status}'
            }), 404
        kit.status = status
        db.session.commit()
        return jsonify({
            'message': 'Kit stauts changed successfully',
            'kit_id': kit_id,
            'status': status
        }),200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Error updating status'
        }), 400





