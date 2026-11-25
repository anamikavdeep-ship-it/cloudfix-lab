
const steps = [
    {
        layer: "BROWSER / USER SIDE",
        title: "Step 1 – Reproduce the issue",
        description: "Establish whether the website is failing for one user or all users.",
        task: "Ask the customer to try another browser or network. Record the exact error.",
        command: "curl -Iv https://example.com",
        options: [
            {
                label: "Website fails for everyone",
                feedback: "This suggests a wider service-side issue. Continue with DNS and infrastructure checks."
            },
            {
                label: "Only one user is affected",
                feedback: "Investigate the user's browser, proxy, VPN, local DNS and network before changing AWS."
            },
            {
                label: "Website loads intermittently",
                feedback: "Investigate intermittent DNS, network, load balancer and application problems. Record timestamps."
            }
        ]
    },
    {
        layer: "DNS / ROUTE 53",
        title: "Step 2 – Check DNS resolution",
        description: "DNS translates the website domain into an IP address.",
        task: "Verify that the domain resolves to the expected IP address.",
        command: "nslookup example.com",
        options: [
            {
                label: "Correct IP returned",
                feedback: "DNS resolution appears successful. Move to network connectivity checks."
            },
            {
                label: "Incorrect IP returned",
                feedback: "Investigate Route 53 records, alias records and cached DNS responses."
            },
            {
                label: "DNS lookup fails",
                feedback: "Check DNS records, nameservers and resolver availability."
            }
        ]
    },
    {
        layer: "NETWORK / FIREWALL",
        title: "Step 3 – Check port connectivity",
        description: "The browser needs to establish a TCP connection to the destination.",
        task: "Verify whether HTTPS port 443 is reachable.",
        command: "nc -zv example.com 443",
        options: [
            {
                label: "Port 443 connection succeeds",
                feedback: "TCP connectivity works from this test location. Continue to TLS verification."
            },
            {
                label: "Connection times out",
                feedback: "Investigate routing, Security Groups, NACLs, firewall rules and destination availability."
            },
            {
                label: "Connection refused",
                feedback: "The destination is reachable, but the service may not be listening on port 443."
            }
        ]
    },
    {
        layer: "SSL / TLS",
        title: "Step 4 – Check HTTPS",
        description: "HTTPS requires a successful TLS handshake and valid server certificate.",
        task: "Check certificate validity, hostname, expiration and TLS handshake.",
        command: "curl -Iv https://example.com",
        options: [
            {
                label: "TLS handshake succeeds",
                feedback: "TLS is working. Continue to inspect the HTTP response."
            },
            {
                label: "Certificate error",
                feedback: "Check expiration, hostname mismatch, certificate chain and ALB certificate configuration."
            },
            {
                label: "TLS handshake fails",
                feedback: "Investigate TLS versions, security policies and listener configuration."
            }
        ]
    },
    {
        layer: "HTTP / APPLICATION",
        title: "Step 5 – Inspect HTTP response",
        description: "Now investigate the response returned by the server.",
        task: "Inspect the HTTP status code and determine whether the error is from the ALB or application.",
        command: "curl -Iv https://example.com",
        options: [
            {
                label: "HTTP 200 – Success",
                feedback: "The server responds successfully. If the page still looks broken, inspect browser rendering and page resources."
            },
            {
                label: "HTTP 403 – Forbidden",
                feedback: "Check access permissions, WAF rules, application authorization and bucket policies where applicable."
            },
            {
                label: "HTTP 404 – Not Found",
                feedback: "Check URL paths, application routes and web server configuration."
            },
            {
                label: "HTTP 5xx – Server error",
                feedback: "Investigate the ALB, application server and backend dependencies."
            }
        ]
    },
    {
        layer: "AWS LOAD BALANCER",
        title: "Step 6 – Investigate ALB",
        description: "The Application Load Balancer forwards incoming requests to registered targets.",
        task: "Check ALB listeners, target groups, target health and Security Groups.",
        command: "AWS Console:\nEC2 → Load Balancers\nEC2 → Target Groups",
        options: [
            {
                label: "All targets are healthy",
                feedback: "Check listener rules, ALB access logs, target response time and application behavior."
            },
            {
                label: "Targets are unhealthy",
                feedback: "Investigate health-check path, port, protocol, response codes and EC2 application status."
            },
            {
                label: "Listener configuration issue",
                feedback: "Verify HTTPS port 443, certificate association, forwarding rules and target group selection."
            }
        ]
    },
    {
        layer: "EC2 / APPLICATION",
        title: "Step 7 – Investigate EC2",
        description: "The instance can be running while its application is stopped or overloaded.",
        task: "Check application service, listening ports, CPU, memory, disk and application logs.",
        command: "systemctl status nginx\nsudo ss -tulnp\ntop\nfree -h\ndf -h\njournalctl -u nginx -n 50",
        options: [
            {
                label: "Application service is stopped",
                feedback: "Investigate the reason, review logs, resolve the underlying issue and restart the service if appropriate."
            },
            {
                label: "Application is running but slow",
                feedback: "Investigate CPU, memory, disk, application processes, database response time and dependencies."
            },
            {
                label: "Application responds locally",
                feedback: "Compare local and ALB access. Check target port, security groups, health checks and backend dependencies."
            }
        ]
    }
];

let currentStep = 0;
let selectedOption = null;

const stepTitle = document.getElementById("stepTitle");
const layerTag = document.getElementById("layerTag");
const description = document.getElementById("stepDescription");
const task = document.getElementById("stepTask");
const command = document.getElementById("command");
const optionsContainer = document.getElementById("options");
const feedback = document.getElementById("feedback");
const feedbackText = document.getElementById("feedbackText");
const nextBtn = document.getElementById("nextBtn");
const previousBtn = document.getElementById("previousBtn");
const progressFill = document.getElementById("progressFill");
const stepCounter = document.getElementById("stepCounter");

function renderStep() {
    const step = steps[currentStep];

    selectedOption = null;

    layerTag.textContent = step.layer;
    stepTitle.textContent = step.title;
    description.textContent = step.description;
    task.textContent = step.task;
    command.textContent = step.command;

    stepCounter.textContent =
        `STEP ${currentStep + 1} / ${steps.length}`;

    progressFill.style.width =
        `${((currentStep + 1) / steps.length) * 100}%`;

    optionsContainer.innerHTML = "";

    step.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.className = "option";
        button.textContent = option.label;

        button.addEventListener("click", () => {
            selectOption(index);
        });

        optionsContainer.appendChild(button);
    });

    feedback.classList.add("hidden");
    nextBtn.disabled = true;

    previousBtn.disabled = currentStep === 0;
}

function selectOption(index) {
    selectedOption = index;

    const option = steps[currentStep].options[index];

    document.querySelectorAll(".option").forEach((button, i) => {
        button.classList.toggle("selected", i === index);
    });

    feedbackText.textContent = option.feedback;
    feedback.classList.remove("hidden");

    nextBtn.disabled = false;

    nextBtn.textContent =
        currentStep === steps.length - 1
            ? "Finish Investigation"
            : "Next Investigation →";
}

nextBtn.addEventListener("click", () => {
    if (selectedOption === null) return;

    if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
    } else {
        showCompletion();
    }
});

previousBtn.addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        renderStep();
    }
});

document.getElementById("copyButton").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(command.textContent);
        document.getElementById("copyButton").textContent = "Copied!";
    } catch {
        document.getElementById("copyButton").textContent = "Copy failed";
    }
});

function showCompletion() {
    stepTitle.textContent = "Investigation Walkthrough Completed!";
    layerTag.textContent = "LAB COMPLETED";
    description.textContent =
        "You have completed all seven troubleshooting stages.";

    task.textContent =
        "In a real incident, apply the identified fix and verify website recovery.";

    command.textContent =
        "DNS → Network → TLS → HTTP → ALB → EC2";

    optionsContainer.innerHTML = "";

    feedback.classList.remove("hidden");
    feedbackText.textContent =
        "Excellent work! You have completed the CloudFix Lab investigation walkthrough.";

    nextBtn.textContent = "Restart Lab";
    nextBtn.disabled = false;
    nextBtn.onclick = () => {
        currentStep = 0;
        nextBtn.onclick = null;
        renderStep();
    };

    previousBtn.disabled = true;
}

renderStep();
