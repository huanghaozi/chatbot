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
stop = ['\nQUs:', '\nAIs:']


@app.route('/change', methods=['GET'])
def change_topic():
    session['prompt'] = None
    return 'success'


@app.route('/chat', methods=['GET'])
def get_request_json():
    global stop
    prompt_outside = request.args.get('wd')
    if session.get('prompt') is None:
        session['prompt'] = list()
    session['prompt'].append(stop[0] + prompt_outside + stop[1])
    if len(session.get('prompt')) > 4:
        session['prompt'] = session.get('prompt')[:4]
    prompt_outside = ''.join(session.get('prompt'))
    if len(prompt_outside) < 1:
        return '问题不能为空'
    if len(prompt_outside) > 150:
        return '问题过长'

    def generate(prompt):
        try:
            resp_gen = openai.Completion.create(
                model="text-davinci-001",
                prompt=prompt,
                temperature=0.6,
                max_tokens=2000-len(prompt),
                frequency_penalty=0,
                presence_penalty=0.6,
                stop=stop,
                stream=True
            )
            for resp in resp_gen:
                session['prompt'][-1] += resp.get('choices')[0].text
                yield 'data: ' + resp.get('choices')[0].text.\
                    replace('\n', '%20').replace('\t', '%09') + '\n\n'
            yield 'data: [DONE]\n\n'
        except Exception as e:
            yield 'data: {}\n\n'.format(e)
            yield 'data: [DONE]\n\n'
    return app.response_class(stream_with_context(generate(prompt_outside)),
                              mimetype='text/event-stream')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1217)
