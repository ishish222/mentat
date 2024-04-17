function insert_operator(list, html) {
    list.innerHTML +=
    `<div class="p-4 self-end mb-4 pb-8 chatbox">
        <b>Operator: </b>${html}
    </div>`;
    list.scrollTo(0, list.scrollHeight);
}

function insert_assistant(list, html) {
    list.innerHTML +=
    `<div class="p-4 self-end mb-4 pb-8 chatbox">
        <b>Mentat: </b>${html}
    </div>`;
    list.scrollTo(0, list.scrollHeight);
}

(function () {
    const vscode = acquireVsCodeApi();
    const list = document.getElementById("chat-history");

    window.addEventListener("message", (event) => {
        const message = event.data;
        

        switch (message.type) {
            case "operator":
                if(message.code != null) {
                    html = marked.parseInline(message.value + "<br /> <br /><pre class='overflow-auto'><code>```" + message.code + "```</code></pre>");
                }
                else {
                    html = message.value;
                }
                insert_operator(list, html);
                document.getElementById("in-progress")?.classList?.remove("hidden");
                break;
            case "assistant":
                document.getElementById("in-progress")?.classList?.add("hidden");
                insert_assistant(list, message.value);
                break;
            default:
                break;
        }
    });


    let submitHandler = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = document.getElementById("question-input");
        if (input.value?.length > 0) {
            vscode.postMessage({
                type: "queryMentat",
                value: input.value,
            });

            input.value = "";
        }
    };

    document.getElementById("clear-button")?.addEventListener("click", () => {
        list.innerHTML = "";
        vscode.postMessage({ type: "clearChat", });
    });
    document.getElementById("question-input")?.addEventListener("keydown", function (e) {
        console.log(e.key);
        if (e.key === "Enter" && !e.shiftKey) {
            submitHandler(e);
        }
    });
})();
