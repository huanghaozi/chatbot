import os
from datetime import timedelta
# from revChatGPT import Official as chatGPT
import openai
from flask import Flask, request, session, stream_with_context

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# Please modify API key in the code below
# 请以下语句中的sk-XXXXX修改为自己的API Key
openai.api_key = 'sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

@app.route('/change', methods=['GET'])
def change_topic():
    session['messages'] = None
    return 'success'


@app.route('/chat', methods=['GET'])
def get_request_json():
    message_outside = request.args.get('wd')
    if session.get('messages') is None:
        session['messages'] = [{
            'role': 'system',
            'content': 'You are a helpful assistant.'
        }]
    session['messages'].append({
        'role': 'user',
        'content': message_outside
    })
    messages_outside = session.get('messages')

    def generate(messages):
        try:
            resp_gen = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.6,
                stream=True
            )
            for resp in resp_gen:
                output_content = str()
                for choice in resp.get('choices'):
                    delta = choice['delta']
                    if 'content' in delta:
                        output_content += delta['content']
                    if choice['finish_reason'] is not None:
                        break
                # resp_message = resp.get('choices')[0]['message']
                # session['messages'].append(resp_message)
                yield 'data: ' + output_content.\
                    replace('\n', '%20').replace('\t', '%09') + '\n\n'
            yield 'data: [DONE]\n\n'
        except Exception as e:
            yield 'data: {}\n\n'.format(e)
            yield 'data: [DONE]\n\n'
    return app.response_class(stream_with_context(generate(messages_outside)),
                              mimetype='text/event-stream')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1217)
