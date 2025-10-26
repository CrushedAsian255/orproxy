const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3001;

function applyCaching(messageArray, cacheMode) {
    if (cacheMode == "last") {
        for (let i = messageArray.length - 1; i >= 0; i--) {
            if (typeof messageArray[i]["content"] == "string") {
                messageArray[i]["content"] = [
                    {
                        type: "text",
                        text: messageArray[i]["content"],
                        cache_control: {
                            type: "ephemeral",
                        },
                    },
                ];
                return;
            } else if (Array.isArray(messageArray[i]["content"])) {
                for (let j = messageArray[i]["content"].length; j >= 0; j--) {
                    if (messageArray[i]["content"][j]["type"] == "text") {
                        messageArray[i]["content"][j]["cache_control"] = {
                            type: "ephemeral",
                        };
                        return;
                    }
                }
            } else {
                // Unknown message type
            }
        }
    } else {
        // Unknown cache mode, ignore
    }
}

app.use(express.json({ limit: "10gb" }));
app.use(
    express.urlencoded({
        limit: "10gb",
        extended: true,
        parameterLimit: 10000000,
    })
);
app.use("/v1/chat/completions", bodyParser.raw({ type: "application/json" }));
app.post("/v1/chat/completions", async (req, res) => {
    try {
        const requestBody = req.body;
        let modifiedBody = { ...requestBody };

        const model = requestBody.model;
        let slug = model;
        let params = [];
        const parts = model.split("$");
        if (parts.length > 1) {
            slug = parts[0];
            params = parts[1].split(",");
        }

        for (let param of params) {
            if (
                [
                    "int4",
                    "int8",
                    "fp4",
                    "fp6",
                    "fp8",
                    "fp16",
                    "bf16",
                    "fp32",
                ].includes(param)
            ) {
                // Quantization lock
                if (!("provider" in modifiedBody)) {
                    modifiedBody["provider"] = {};
                }
                if (!("quantizations" in modifiedBody.provider)) {
                    modifiedBody.provider["quantizations"] = [];
                }
                modifiedBody.provider.quantizations.push(param);
            } else if (param.startsWith("think")) {
                // Thinking options
                if (param.includes(".")) {
                    let thinking_option = param.split(".")[1];
                    if (["no", "off"].includes(thinking_option)) {
                        modifiedBody["reasoning"] = { enabled: false };
                    } else if (isNaN(thinking_option)) {
                        modifiedBody["reasoning"] = {
                            enabled: true,
                            effort: thinking_option,
                        };
                    } else {
                        modifiedBody["reasoning"] = {
                            enabled: true,
                            max_tokens: +thinking_option,
                        };
                    }
                } else {
                    modifiedBody["reasoning"] = { enabled: true };
                }
            } else if (param == "cache") {
                const cacheMode = param.includes(".")
                    ? param.split(".")[1]
                    : "last"; // Set default caching mode to 'last'
                applyCaching(modifiedBody["messages"], cacheMode);
            } else if (param == "zdr") {
                // Zero Data Retention endpoint requirement
                if (!("provider" in modifiedBody)) {
                    modifiedBody["provider"] = {};
                }
                modifiedBody["provider"]["zdr"] = true;
            } else {
                // If nothing else matches, its a provider name
                if (!("provider" in modifiedBody)) {
                    modifiedBody["provider"] = {};
                }
                if (!("only" in modifiedBody.provider)) {
                    modifiedBody.provider["only"] = [];
                }
                modifiedBody.provider.only.push(param);
            }
        }
        modifiedBody.model = slug;
        modifiedBody.usage = {
            include: true,
        };
        const headers = { ...req.headers };
        headers["host"] = "openrouter.ai";
        delete headers["content-length"];
        const response = await axios({
            method: "POST",
            url: "https://openrouter.ai/api/v1/chat/completions",
            data: modifiedBody,
            headers,
            responseType: "stream",
        });
        Object.keys(response.headers).forEach((key) => {
            res.setHeader(key, response.headers[key]);
        });
        response.data.on("data", (chunk) => {
            res.write(chunk);
        });
        response.data.on("end", async () => {
            res.end();
        });
        response.data.on("error", async (err) => {
            console.error("Stream error:", err);
            res.status(500).send("Internal Server Error");
        });
    } catch (err) {
        console.error(err.message);
        return res
            .status(500)
            .send({ error: "Internal Server Error", details: err.message });
    }
});

app.use(
    "/v1",
    createProxyMiddleware({
        target: "https://www.openrouter.ai",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return "api/" + path;
        },
        onError: (err, req, res) => {
            console.error("Proxy error:", err);
            res.status(502).json({ error: "Proxy request failed" });
        },
    })
);

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});

process.on("SIGINT", async () => {
    console.log("Shutting down...");
    process.exit(0);
});
